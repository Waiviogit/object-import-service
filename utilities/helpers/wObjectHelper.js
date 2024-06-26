/* eslint-disable camelcase */
const _ = require('lodash');
const { Wobj } = require('../../models');

const {
  REQUIREDFIELDS_PARENT,
  MIN_PERCENT_TO_SHOW_UPGATE,
  VOTE_STATUSES,
  ADMIN_ROLES,
  categorySwitcher,
  FIELDS_NAMES,
  ARRAY_FIELDS,
  INDEPENDENT_FIELDS,
  FULL_SINGLE_FIELDS,
  LANGUAGES_POPULARITY,
  SHOP_SETTINGS_TYPE,
  OBJECT_TYPES,
  REMOVE_OBJ_STATUSES,
} = require('../../constants/wobjectsData');

const jsonHelper = require('./jsonHelper');

const calculateApprovePercent = (field) => {
  if (field.adminVote) return field.adminVote.status === VOTE_STATUSES.APPROVED ? 100 : 0;
  if (field.weight <= 0) return 0;

  const rejectsWeight = _.sumBy(field.active_votes, (vote) => {
    if (vote.percent < 0) {
      return -(+vote.weight || -1);
    }
  }) || 0;
  const approvesWeight = _.sumBy(field.active_votes, (vote) => {
    if (vote.percent > 0) {
      return +vote.weight || 1;
    }
  }) || 0;
  if (!rejectsWeight) return 100;
  const percent = _.round((approvesWeight / (approvesWeight + rejectsWeight)) * 100, 3);
  return percent > 0 ? percent : 0;
};

/** We have some types of admins at wobject, in this method we find admin role type */
const getFieldVoteRole = (vote) => {
  let role = ADMIN_ROLES.ADMIN;
  vote.ownership ? role = ADMIN_ROLES.OWNERSHIP : null;
  vote.administrative ? role = ADMIN_ROLES.ADMINISTRATIVE : null;
  vote.owner ? role = ADMIN_ROLES.OWNER : null;
  return role;
};

const addDataToFields = ({
  fields,
  filter,
  admins,
  ownership,
  administrative,
  isOwnershipObj,
  owner,
  blacklist = [],
}) => {
  /** Filter, if we need not all fields */
  if (filter) fields = _.filter(fields, (field) => _.includes(filter, field.name));

  for (const field of fields) {
    // recount field weight and filter votes if black list not empty
    field.weight += (field?.weightWAIV ?? 0);
    if (
      !_.isEmpty(blacklist)
      && !_.isEmpty(field.active_votes)
      && field.name !== FIELDS_NAMES.AUTHORITY
      && _.some(field.active_votes, (v) => _.includes(blacklist, v.voter))
    ) {
      field.active_votes = _.filter(field.active_votes, (o) => !_.includes(blacklist, o.voter));
      const weightHive = _.sumBy(field.active_votes, (vote) => vote.weight) || 0;
      const weightWaiv = _.sumBy(field.active_votes, (vote) => vote.weightWAIV) || 0;
      field.weight = weightHive + weightWaiv;
    }
    let adminVote, administrativeVote, ownershipVote, ownerVote;
    _.map(field.active_votes, (vote) => {
      vote.timestamp = vote._id
        ? vote._id.getTimestamp().valueOf()
        : Date.now();
      if (vote.voter === owner) {
        vote.owner = true;
        ownerVote = vote;
      } else if (_.includes(admins, vote.voter)) {
        vote.admin = true;
        vote.timestamp > _.get(adminVote, 'timestamp', 0) ? adminVote = vote : null;
      } else if (_.includes(administrative, vote.voter)) {
        vote.administrative = true;
        vote.timestamp > _.get(administrativeVote, 'timestamp', 0) ? administrativeVote = vote : null;
      } else if (isOwnershipObj && _.includes(ownership, vote.voter)) {
        vote.ownership = true;
        vote.timestamp > _.get(ownershipVote, 'timestamp', 0) ? ownershipVote = vote : null;
      }
    });
    if (_.has(field, '_id')) {
      field.createdAt = field._id.getTimestamp()
        .valueOf();
    }
    /** If field includes admin votes fill in it */
    if (ownerVote || adminVote || administrativeVote || ownershipVote) {
      const mainVote = ownerVote || adminVote || ownershipVote || administrativeVote;
      if (mainVote.percent !== 0) {
        field.adminVote = {
          role: getFieldVoteRole(mainVote),
          status: mainVote.percent > 0 ? VOTE_STATUSES.APPROVED : VOTE_STATUSES.REJECTED,
          name: mainVote.voter,
          timestamp: mainVote.timestamp,
        };
      }
    }
    field.approvePercent = calculateApprovePercent(field);
  }
  return fields;
};

const specialFieldFilter = (idField, allFields, id) => {
  if (!idField.adminVote && idField.weight < 0) return null;
  idField.items = [];
  const filteredItems = _.filter(
    allFields[categorySwitcher[id]],
    (item) => item.id === idField.id && _.get(item, 'adminVote.status') !== VOTE_STATUSES.REJECTED,
  );

  for (const itemField of filteredItems) {
    if (!idField.adminVote && itemField.weight < 0) continue;
    idField.items.push(itemField);
  }
  return idField;
};

const arrayFieldPush = ({
  filter,
  field,
}) => {
  if (_.includes(filter, FIELDS_NAMES.GALLERY_ALBUM)) return false;
  if (_.get(field, 'adminVote.status') === VOTE_STATUSES.APPROVED) return true;
  if (field.weight > 0 && field.approvePercent > MIN_PERCENT_TO_SHOW_UPGATE) {
    return true;
  }
  return false;
};

const arrayFieldFilter = ({
  idFields,
  allFields,
  filter,
  id,
}) => {
  const validFields = [];
  for (const field of idFields) {
    if (_.get(field, 'adminVote.status') === VOTE_STATUSES.REJECTED) continue;
    switch (id) {
      case FIELDS_NAMES.TAG_CATEGORY:
      case FIELDS_NAMES.GALLERY_ALBUM:
        validFields.push(specialFieldFilter(field, allFields, id));
        break;
      case FIELDS_NAMES.RATING:
      case FIELDS_NAMES.PHONE:
      case FIELDS_NAMES.BUTTON:
      case FIELDS_NAMES.BLOG:
      case FIELDS_NAMES.FORM:
      case FIELDS_NAMES.GALLERY_ITEM:
      case FIELDS_NAMES.LIST_ITEM:
      case FIELDS_NAMES.NEWS_FILTER:
      case FIELDS_NAMES.COMPANY_ID:
      case FIELDS_NAMES.PRODUCT_ID:
      case FIELDS_NAMES.OPTIONS:
      case FIELDS_NAMES.AUTHORS:
      case FIELDS_NAMES.DEPARTMENTS:
      case FIELDS_NAMES.FEATURES:
      case FIELDS_NAMES.AUTHORITY:
      case FIELDS_NAMES.PIN:
      case FIELDS_NAMES.MENU_ITEM:
      case FIELDS_NAMES.ADD_ON:
      case FIELDS_NAMES.RELATED:
      case FIELDS_NAMES.SIMILAR:
      case FIELDS_NAMES.WALLET_ADDRESS:
      case FIELDS_NAMES.DELEGATION:
        if (arrayFieldPush({
          filter,
          field,
        })) {
          validFields.push(field);
        }
        break;
      case FIELDS_NAMES.GROUP_ID:
      case FIELDS_NAMES.REMOVE:
      case FIELDS_NAMES.AFFILIATE_GEO_AREA:
      case FIELDS_NAMES.AFFILIATE_PRODUCT_ID_TYPES:
        if (arrayFieldPush({
          filter,
          field,
        })) {
          validFields.push(field.body);
        }
        break;
      default:
        break;
    }
  }
  const result = _.compact(validFields);

  if (id === FIELDS_NAMES.DEPARTMENTS) {
    if (result.length > 10) {
      const sorted = _.orderBy(result, ['weight'], ['desc']);
      return {
        result: _.take(sorted, 10),
        id,
      };
    }
  }

  return {
    result,
    id,
  };
};

const filterFieldValidation = (filter, field, locale, ownership) => {
  field.locale === 'auto' ? field.locale = 'en-US' : null;
  let result = _.includes(INDEPENDENT_FIELDS, field.name) || locale === field.locale;
  if (filter) result = result && _.includes(filter, field.name);
  if (ownership?.length) {
    result = (result && _.includes([ADMIN_ROLES.OWNERSHIP, ADMIN_ROLES.ADMIN, ADMIN_ROLES.OWNER], _.get(field, 'adminVote.role')))
      || (result && _.includes(ownership, field?.creator));
  }
  return result;
};

const getLangByPopularity = (existedLanguages) => {
  const filtered = _.filter(
    LANGUAGES_POPULARITY,
    (l) => _.includes(existedLanguages, l.lang),
  );
  const found = _.minBy(filtered, 'score');
  if (!found) return 'en-US';
  return found.lang;
};

const listItemsPick = ({ listItems, locale, index }) => {
  const result = [];
  const groupedItems = index === FIELDS_NAMES.LIST_ITEM
    ? _.groupBy(listItems, 'body')
    : _.groupBy(listItems.map((el) => {
      const parsedLink = jsonHelper.parseJson(el.body);
      const groupField = `${parsedLink?.linkToObject}${parsedLink?.style}`
        || `${parsedLink?.linkToWeb}${parsedLink?.style}`;
      return {
        ...el,
        groupField,
      };
    }), 'groupField');

  for (const item in groupedItems) {
    const ourLocale = groupedItems[item]
      .find((el) => arrayFieldPush({ field: el }) && el.locale === locale);
    if (ourLocale) {
      result.push(ourLocale);
      continue;
    }
    if (locale !== 'en-US') {
      const enLocale = groupedItems[item]
        .find((el) => arrayFieldPush({ field: el }) && el.locale === 'en-US');
      if (enLocale) {
        result.push(enLocale);
        continue;
      }
    }
    const maxWeightLocale = _.maxBy(groupedItems[item]
      .filter((el) => arrayFieldPush({ field: el })), 'weight');
    if (maxWeightLocale) result.push(maxWeightLocale);
  }

  return result;
};

/**
 * the method sorts the fields by name, then for each individual type checks if there are fields
 * with the requested locale, if there are - processes them if not, requests the English locale
 * @param fields {[Object]}
 * @param locale {String}
 * @param filter {[String]}
 * @param ownership {[String]}
 * @returns {[Object]}
 */
const getFilteredFields = (fields, locale, filter, ownership) => {
  const fieldsLanguages = [];

  const fieldTypes = _.reduce(fields, (acc, el) => {
    const conditionLocale = _.get(el, 'adminVote.status') === VOTE_STATUSES.APPROVED
      || el.weight > 0;

    if (_.has(acc, `${el.name}`)) {
      const locales = _.find(fieldsLanguages, (l) => l.type === el.name);
      if (!locales && conditionLocale) {
        fieldsLanguages.push({
          type: el.name,
          languages: [el.locale],
        });
      }
      if (locales && !_.includes(locales.languages, el.locale) && conditionLocale) {
        locales.languages.push(el.locale);
      }

      acc[el.name].push(el);
      return acc;
    }
    if (conditionLocale) {
      fieldsLanguages.push({
        type: el.name,
        languages: [el.locale],
      });
    }
    acc[el.name] = [el];
    return acc;
  }, {});

  return _.reduce(fieldTypes, (acc, el, index) => {
    if ([FIELDS_NAMES.LIST_ITEM, FIELDS_NAMES.MENU_ITEM].includes(index)) {
      const items = listItemsPick({ listItems: el, locale, index });
      acc = [...acc, ...items];
      return acc;
    }

    const fieldLanguage = _.find(fieldsLanguages, (l) => l.type === index);
    const existedLanguages = _.get(fieldLanguage, 'languages', []);

    const nativeLang = _.filter(
      el,
      (field) => filterFieldValidation(filter, field, locale, ownership)
        && _.includes(existedLanguages, field.locale),
    );

    _.isEmpty(nativeLang)
      ? acc = [
        ...acc,
        ..._.filter(el, (field) => filterFieldValidation(
          filter,
          field,
          getLangByPopularity(existedLanguages),
          ownership,
        ))]
      : acc = [...acc, ...nativeLang];
    return acc;
  }, []);
};

const getSingleFieldsDisplay = (field) => {
  if (!field) return;
  if (FULL_SINGLE_FIELDS.includes(field.name)) return field;
  return field.body;
};

const setWinningFields = ({ id, winningField, winningFields }) => {
  winningFields[id] = getSingleFieldsDisplay(winningField);

  if (id === FIELDS_NAMES.DESCRIPTION) {
    winningFields.descriptionCreator = winningField.creator;
  }
};

const getFieldsToDisplay = (fields, locale, filter, permlink, ownership) => {
  locale = locale === 'auto' ? 'en-US' : locale;
  const winningFields = {};
  const filteredFields = getFilteredFields(fields, locale, filter, ownership);

  if (!filteredFields.length) return {};

  const groupedFields = _.groupBy(filteredFields, 'name');
  for (const id of Object.keys(groupedFields)) {
    const approvedFields = _.filter(
      groupedFields[id],
      (field) => _.get(field, 'adminVote.status') === VOTE_STATUSES.APPROVED,
    );

    if (_.includes(ARRAY_FIELDS, id)) {
      const {
        result,
        id: newId,
      } = arrayFieldFilter({
        idFields: groupedFields[id],
        allFields: groupedFields,
        filter,
        id,
        permlink,
      });
      if (result.length) winningFields[newId] = result;
      continue;
    }
    // pick from admin fields
    if (approvedFields.length) {
      const ownerVotes = _.filter(
        approvedFields,
        (field) => field.adminVote.role === ADMIN_ROLES.OWNER,
      );
      const adminVotes = _.filter(
        approvedFields,
        (field) => field.adminVote.role === ADMIN_ROLES.ADMIN,
      );
      if (ownerVotes.length) {
        const winningField = _.maxBy(ownerVotes, 'adminVote.timestamp');
        winningFields[id] = getSingleFieldsDisplay(winningField);
        setWinningFields({ id, winningFields, winningField });
      } else if (adminVotes.length) {
        const winningField = _.maxBy(adminVotes, 'adminVote.timestamp');
        setWinningFields({ id, winningFields, winningField });
      } else {
        const winningField = _.maxBy(approvedFields, 'adminVote.timestamp');
        setWinningFields({ id, winningFields, winningField });
      }
      continue;
    }
    // pick from heaviest field
    const winningField = _.maxBy(groupedFields[id], (field) => {
      if (_.get(field, 'adminVote.status') !== 'rejected' && field.weight > 0
        && field.approvePercent > MIN_PERCENT_TO_SHOW_UPGATE) {
        return field.weight;
      }
    });
    if (winningField) setWinningFields({ id, winningFields, winningField });
  }
  return winningFields;
};

/** Get info of wobject parent with specific winning fields */
const getParentInfo = async ({
  locale,
  app,
  parent,
}) => {
  if (parent) {
    if (!parent) return '';
    parent = await processWobjects({
      locale,
      fields: REQUIREDFIELDS_PARENT,
      wobjects: [_.omit(parent, 'parent')],
      returnArray: false,
      app,
    });
  } else {
    parent = '';
  }
  return parent;
};

const getTopTags = (obj, limit = 2) => {
  const tagCategories = _.get(obj, 'tagCategory', []);
  if (_.isEmpty(tagCategories)) return [];
  let tags = [];
  for (const tagCategory of tagCategories) {
    tags = _.concat(tags, tagCategory.items);
  }

  return _
    .chain(tags)
    .orderBy('weight', 'desc')
    .slice(0, limit)
    .map('body')
    .value();
};

const getOwnerAndAdmins = (app) => {
  let owner = app?.owner;
  const admins = app?.admins ?? [];
  /** if owner add himself to admins means that he has same rights on object as admins */
  if (admins.includes(owner)) {
    owner = '';
  }

  return { owner, admins };
};

const filterAssignedAdmin = (admins, field) => field.name === FIELDS_NAMES.DELEGATION
  && admins.includes(field.creator);

const getAssignedAdmins = ({
  admins = [],
  owner,
  object,
  ownership,
  administrative,
  blacklist,
}) => {
  let fields = object?.fields?.filter((f) => filterAssignedAdmin([...admins, owner], f));
  if (!fields?.length) return [];

  fields = addDataToFields({
    isOwnershipObj: !!ownership.length,
    fields,
    filter: [FIELDS_NAMES.DELEGATION],
    admins,
    ownership,
    administrative,
    owner,
    blacklist,
  });

  const processed = getFieldsToDisplay(
    fields,
    'en-US',
    [FIELDS_NAMES.DELEGATION],
    object.author_permlink,
    ownership,
  );

  if (!processed[FIELDS_NAMES.DELEGATION]) return [];

  return processed[FIELDS_NAMES.DELEGATION].map((el) => el.body);
};

/** Parse wobjects to get its winning */
const processWobjects = async ({
  wobjects,
  fields,
  locale = 'en-US',
  app,
  returnArray = true,
  topTagsLimit,
}) => {
  const filteredWobj = [];
  if (!_.isArray(wobjects)) return filteredWobj;
  let parents = [];
  const parentPermlinks = _.chain(wobjects)
    .map('parent')
    .compact()
    .uniq()
    .value();
  if (parentPermlinks.length) {
    ({ result: parents } = await Wobj.find({
      filter: { author_permlink: { $in: parentPermlinks } },
      projection: { search: 0, departments: 0 },
    }));
  }

  /** Get waivio admins and owner */
  const { owner, admins } = getOwnerAndAdmins(app);

  // means that owner want's all objects on sites behave like ownership objects
  const objectControl = !!app?.objectControl;
  const userShop = app?.configuration?.shopSettings?.type === SHOP_SETTINGS_TYPE.USER;
  const extraAuthority = userShop
    ? app?.configuration?.shopSettings?.value
    : app?.owner;

  for (let obj of wobjects) {
    obj.parent = '';
    if (obj.newsFilter) obj = _.omit(obj, ['newsFilter']);

    /** Get app admins, wobj administrators, which was approved by app owner(creator) */
    const ownership = _.intersection(_.get(obj, 'authority.ownership', []), _.get(app, 'authority', []));
    const administrative = _.intersection(_.get(obj, 'authority.administrative', []), _.get(app, 'authority', []));

    // get admins that can be assigned by owner or other admins
    const assignedAdmins = getAssignedAdmins({
      admins, ownership, administrative, owner, blacklist: [], object: obj,
    });
    const objectAdmins = [...admins, ...assignedAdmins];

    if (objectControl
      && (!_.isEmpty(administrative)
        || !_.isEmpty(ownership)
        || _.get(obj, 'authority.administrative', []).includes(extraAuthority)
        || _.get(obj, 'authority.ownership', []).includes(extraAuthority)
      )
    ) {
      ownership.push(extraAuthority, ...objectAdmins);
    }

    obj.fields = addDataToFields({
      isOwnershipObj: !!ownership.length,
      fields: _.compact(obj.fields),
      filter: fields,
      admins: objectAdmins,
      ownership,
      administrative,
      owner,
      blacklist: [],
    });
    /** Omit map, because wobject has field map, temp solution? maybe field map in wobj not need */
    obj = _.omit(obj, ['map', 'search']);
    obj = {
      ...obj,
      ...getFieldsToDisplay(obj.fields, locale, fields, obj.author_permlink, ownership),
    };

    if (obj.sortCustom) obj.sortCustom = JSON.parse(obj.sortCustom);
    if (obj.newsFilter) {
      obj.newsFilter = _.map(obj.newsFilter, (item) => _.pick(item, ['title', 'permlink', 'name']));
    }
    if (_.isString(obj.parent)) {
      const parent = _.find(parents, { author_permlink: obj.parent });
      obj.parent = await getParentInfo({
        locale,
        app,
        parent,
      });
    }
    if (obj.departments && typeof obj.departments[0] === 'string') {
      obj.departments = null;
    }
    if (_.has(obj, FIELDS_NAMES.TAG_CATEGORY)) obj.topTags = getTopTags(obj, topTagsLimit);
    filteredWobj.push(obj);
  }
  if (!returnArray) return filteredWobj[0];
  return filteredWobj;
};

const getAllObjectsInListForImport = async ({
  authorPermlink, handledItems = [], app, scanEmbedded,
}) => {
  const { result: wobject, error } = await Wobj.findOne({
    filter: {
      author_permlink: authorPermlink,
      'status.title': { $nin: REMOVE_OBJ_STATUSES },
    },
  });
  if (error || !wobject) return handledItems;

  if ([OBJECT_TYPES.PRODUCT, OBJECT_TYPES.BOOK].includes(wobject.object_type)
      && wobject.metaGroupId) {
    const { result } = await Wobj.find({
      filter: {
        author_permlink: { $ne: wobject.author_permlink },
        metaGroupId: wobject.metaGroupId,
      },
      projection: { author_permlink: 1 },
    });
    if (result.length)handledItems.push(...result.map((el) => el.author_permlink));
  }
  if (wobject.object_type === OBJECT_TYPES.LIST) {
    const wobj = await processWobjects({
      wobjects: [wobject],
      fields: [FIELDS_NAMES.LIST_ITEM, FIELDS_NAMES.MENU_ITEM],
      app,
      returnArray: false,
    });
    const listWobjects = _.map(_.get(wobj, FIELDS_NAMES.LIST_ITEM, []), 'body');

    if (_.isEmpty(listWobjects)) return handledItems;

    for (const item of listWobjects) {
      // condition for exit from looping
      if (!handledItems.includes(item)) {
        handledItems.push(item);
        if (scanEmbedded) {
          await getAllObjectsInListForImport({
            authorPermlink: item, handledItems, app, recursive: true, scanEmbedded,
          });
        }
      }
    }
  }
  return handledItems;
};

const getAllObjectsInList = async ({
  authorPermlink, app, scanEmbedded,
}) => {
  const result = [authorPermlink];
  const queue = [authorPermlink];
  const processedLists = new Set();

  while (queue.length > 0) {
    const currentList = queue.shift();
    processedLists.add(currentList);

    const { result: wobject, error } = await Wobj.findOne({
      filter: {
        author_permlink: currentList,
        'status.title': { $nin: REMOVE_OBJ_STATUSES },
      },

    });

    if (error || !wobject) continue;
    if (wobject.object_type !== OBJECT_TYPES.LIST) continue;

    const wobj = await processWobjects({
      wobjects: [wobject],
      fields: [FIELDS_NAMES.LIST_ITEM, FIELDS_NAMES.MENU_ITEM],
      app,
      returnArray: false,
    });

    const listWobjects = _.map(_.get(wobj, FIELDS_NAMES.LIST_ITEM, []), 'body');

    const { result: listFromDb } = await Wobj.find({
      filter: {
        author_permlink: { $in: listWobjects },
      },
      projection: {
        object_type: 1, author_permlink: 1, metaGroupId: 1,
      },
    });

    for (const item of listFromDb) {
      if (result.includes(item.author_permlink)) continue;

      if (item.object_type === OBJECT_TYPES.LIST && !processedLists.has(item.author_permlink)) {
        queue.push(item.author_permlink);
        result.push(item.author_permlink);
        continue;
      }
      if ([OBJECT_TYPES.PRODUCT, OBJECT_TYPES.BOOK].includes(item.object_type)
          && item.metaGroupId) {
        const { result: metaIdClones } = await Wobj.find({
          filter: {
            metaGroupId: item.metaGroupId,
          },
          projection: { author_permlink: 1 },
        });

        if (metaIdClones.length)result.push(...metaIdClones.map((el) => el.author_permlink));
        continue;
      }
      result.push(item.author_permlink);
    }
    if (!scanEmbedded) break;
  }

  return _.uniq(result);
};

module.exports = {
  processWobjects,
  getAllObjectsInListForImport,
  getAllObjectsInList,
};
