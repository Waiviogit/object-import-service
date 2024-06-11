const _ = require('lodash');
const uuid = require('uuid');
const { WHITE_LIST, VOTE_COST } = require('../../constants/voteAbility');
const { OBJECT_TYPES, PARENT_ASIN_FIELDS, OBJECT_FIELDS } = require('../../constants/objectTypes');
const { parseJson } = require('./jsonHelper');
const { generateUniquePermlink } = require('./permlinkGenerator');
const { addField } = require('../services/importObjectsService');
const { formField } = require('./formFieldHelper');
const { Wobj, DatafinityObject } = require('../../models');
const { AMAZON_ASINS } = require('../../constants/appData');
const { broadcastJson } = require('../hiveApi/broadcastUtil');
const { GPT_CRAFTED } = require('../../constants/openai');

const SET_UNIQ_FIELDS = ['name', 'body', 'locale'];
const SET_UNIQ_FIELDS_AUTHORITY = ['name', 'body', 'locale', 'creator'];

const getVoteCost = (account) => {
  if (_.includes(WHITE_LIST, account)) return VOTE_COST.FOR_WHITE_LIST;
  return VOTE_COST.USUAL;
};

const getVoteCostInitial = (account) => {
  if (_.includes(WHITE_LIST, account)) return VOTE_COST.INITIAL_FOR_WHITE_LIST;
  return VOTE_COST.INITIAL;
};

const isUserInWhitelist = (account) => _.includes(WHITE_LIST, account);

const checkBookInProduct = (products) => {
  let book = false;

  for (const product of products) {
    if (product?.categories) {
      const bookInCategories = _.some(product?.categories ?? [], (c) => c.toLocaleLowerCase().includes('book'));
      if (bookInCategories) {
        book = true;
        break;
      }
      continue;
    }
    const bookInTaxonomy = _.some(product?.taxonomy ?? [], (c) => c.toLocaleLowerCase().includes('book'));
    if (bookInTaxonomy) {
      book = true;
      break;
    }
  }
  return book;
};

const groupByAsins = (products, objectType) => {
  const uniqueProducts = [];
  let error;

  if (objectType === OBJECT_TYPES.BOOK) {
    products = _.filter(
      products,
      (p) => _.some(p.categories, (c) => c.toLocaleLowerCase().includes('book')),
    );
  }

  if (objectType === OBJECT_TYPES.PRODUCT) {
    const book = checkBookInProduct(products);
    if (book) {
      error = {
        status: 425,
        message: 'It looks like you are trying to import books with type product. Are you sure you want to continue with the import?',
      };
    }
  }

  const grouped = _.groupBy(products, 'asins');

  for (const groupedKey in grouped) {
    if (groupedKey === 'undefined') {
      uniqueProducts.push(...grouped[groupedKey]);
      continue;
    }
    if (grouped[groupedKey].length > 1) {
      const latest = _.maxBy(grouped[groupedKey], 'dateUpdated');
      let parentAsin = _.find(
        latest?.features,
        (f) => _.includes(PARENT_ASIN_FIELDS, f.key),
      );
      if (parentAsin) {
        uniqueProducts.push(latest);
        continue;
      }
      for (const element of grouped[groupedKey]) {
        parentAsin = _.find(
          element?.features,
          (f) => _.includes(PARENT_ASIN_FIELDS, f.key),
        );
        if (!parentAsin) continue;
        if (!latest.features) {
          latest.features = [parentAsin];
          break;
        }
        latest.features.push(parentAsin);
      }
      uniqueProducts.push(latest || grouped[groupedKey][0]);
      continue;
    }
    uniqueProducts.push(grouped[groupedKey][0]);
  }
  return { uniqueProducts, error };
};

const filterImportRestaurants = (restaurants) => {
  const uniqueProducts = _.reduce(restaurants, (acc, el) => {
    if (el.isClosed === 'true') return acc;
    const duplicate = _.find(
      acc,
      (exist) => el.name === exist.name
            && el.address === exist.address
            && el.city === exist.city,
    );
    if (duplicate) {
      duplicate.ids ? duplicate.ids.push(el.id) : duplicate.ids = [el.id, duplicate.id];
      return acc;
    }
    acc.push(el);
    return acc;
  }, []);

  return { uniqueProducts };
};

const filterImportObjects = ({
  products, objectType,
}) => {
  const filters = {
    restaurant: filterImportRestaurants,
    book: groupByAsins,
    product: groupByAsins,
    default: () => ({ uniqueProducts: products }),
  };
  return (filters[objectType] || filters.default)(products, objectType);
};

const bufferToArray = (buffer) => {
  let stringFromBuffer = buffer.toString();
  const expectValid = stringFromBuffer[0] === '[';
  if (!expectValid) {
    stringFromBuffer = `[${stringFromBuffer.replace(/(}\r\n{|}\n{)/g, '},{')}]`;
  }
  return parseJson(stringFromBuffer, []);
};

const needToSaveObject = (object) => {
  if (object.object_type === OBJECT_TYPES.RESTAURANT) {
    const map = _.find(object.fields, (f) => f.name === OBJECT_FIELDS.MAP);
    if (!map) return false;
  }
  // if (object.object_type === OBJECT_TYPES.PRODUCT) {
  //   const groupIdField = _.find(object.fields, (f) => f.name === OBJECT_FIELDS.GROUP_ID);
  //   const optionsField = _.find(object.fields, (f) => f.name === OBJECT_FIELDS.OPTIONS);
  //   if (groupIdField && !optionsField) return false;
  // }
  return true;
};

const prepareObjectForImport = async (datafinityObject) => {
  const permlink = datafinityObject.author_permlink
    ? datafinityObject.author_permlink
    : await generateUniquePermlink(datafinityObject.name);

  return {
    object_type: datafinityObject.object_type,
    author_permlink: permlink,
    creator: datafinityObject.user,
    default_name: datafinityObject.name,
    locale: datafinityObject.locale || 'en-US',
    is_extending_open: true,
    is_posting_open: true,
    fields: datafinityObject.fields || [],
    datafinityObject: true,
  };
};

const specialFieldsHelper = async ({ datafinityObject, wobject }) => {
  const field = datafinityObject.fields[0];
  if (field.name === OBJECT_FIELDS.CATEGORY_ITEM && !field.id) {
    const existingCategory = _.find(
      wobject.fields,
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === field.tagCategory,
    );
    if (existingCategory) {
      field.id = existingCategory.id;
      return;
    }
    const id = uuid.v4();
    await addField({
      field: formField({
        fieldName: OBJECT_FIELDS.TAG_CATEGORY,
        locale: datafinityObject.locale,
        user: datafinityObject.user,
        body: field.tagCategory,
        id,
      }),
      wobject,
      importingAccount: datafinityObject.user,
      importId: datafinityObject.importId,
    });
    field.id = id;
  }
};

const createReversedJSONStringArray = (input) => {
  const jsonObject = parseJson(input, null);
  if (!jsonObject) return [input];
  const reversedJsonObject = {};

  const keys = Object.keys(jsonObject).reverse();
  for (const key of keys) {
    reversedJsonObject[key] = jsonObject[key];
  }

  return [input, JSON.stringify(reversedJsonObject)];
};

const createAsinVariations = (asin) => {
  const result = [];
  for (const asinName of AMAZON_ASINS) {
    result.push(JSON.stringify({ productIdType: asinName, productId: asin }));
    result.push(JSON.stringify({ productId: asin, productIdType: asinName }));
  }
  return result;
};

const checkObjectExistsByBodyArray = async ({ bodyArr = [], fieldName = '' }) => {
  const { result, error } = await Wobj.findOne({
    filter: {
      fields: {
        $elemMatch: {
          name: fieldName,
          body: { $in: bodyArr },
        },
      },
    },
  });
  if (error) return false;

  return !!result;
};

const validateSameFieldsProductId = ({ fieldData, foundedFields }) => {
  let same;
  for (const body of createReversedJSONStringArray(fieldData.body)) {
    const newField = { ...fieldData, body };
    same = foundedFields.find((field) => _.isEqual(_.pick(field, SET_UNIQ_FIELDS), _.pick(newField, SET_UNIQ_FIELDS)));
    if (same) return !!same;
  }
  return !!same;
};

const validateSameFieldDescription = ({ fieldData, foundedFields }) => {
  const chatGptRegEx = new RegExp(GPT_CRAFTED);

  const wroteByGpt = foundedFields
    .find((f) => f.name === OBJECT_FIELDS.DESCRIPTION && chatGptRegEx.test(f.body));
  if (wroteByGpt) return true;

  return validateSameFieldDefault({ fieldData, foundedFields });
};

const validateSameFieldDefault = ({ fieldData, foundedFields }) => !!foundedFields
  .find((field) => _.isEqual(_.pick(field, SET_UNIQ_FIELDS), _.pick(fieldData, SET_UNIQ_FIELDS)));

const validateSameFieldAuthority = ({ fieldData, foundedFields }) => !!foundedFields
  .find((field) => _.isEqual(_.pick(field, SET_UNIQ_FIELDS_AUTHORITY), _.pick(fieldData, SET_UNIQ_FIELDS_AUTHORITY)));

const validateSameFields = ({ fieldData, wobject }) => {
  const validation = {
    [OBJECT_FIELDS.PRODUCT_ID]: validateSameFieldsProductId,
    [OBJECT_FIELDS.COMPANY_ID]: validateSameFieldsProductId,
    [OBJECT_FIELDS.AVATAR]: () => !!wobject.fields.find((f) => f.name === OBJECT_FIELDS.AVATAR),
    [OBJECT_FIELDS.DESCRIPTION]: validateSameFieldDescription,
    [OBJECT_FIELDS.AUTHORITY]: validateSameFieldAuthority,
    default: validateSameFieldDefault,
  };

  return (validation[fieldData.name] || validation.default)({ fieldData, foundedFields: wobject.fields });
};

const checkAddress = (object) => /[0-9]/.test(_.get(object, 'address', ''));

const capitalizeEachWord = (string) => {
  const arr = string.split(' ');
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }
  return arr.join(' ');
};

const checkObjectExist = async ({ authorPermlink, type }) => {
  const { result } = await Wobj.findOne({
    filter: {
      author_permlink: authorPermlink,
      ...(type && { object_type: type }),
    },
    projection: {
      _id: 1,
    },
  });

  return !!result;
};

const shortestString = (arr = []) => {
  let shortest = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].length < shortest.length) {
      shortest = arr[i];
    }
  }
  return shortest;
};

const isValidHttpUrl = (string) => {
  let url;
  try {
    url = new URL(string);
  } catch (error) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
};

const getProductRating = (product) => {
  const featuresRating = (product?.features ?? []).find((el) => el.key === 'Overall Rating');
  if (featuresRating) {
    return Math.round((_.sum((featuresRating?.value ?? []).map((el) => +el)) ?? 0
        / (featuresRating?.value ?? []).length) * 2) || 0;
  }
  const averageRating = (product?.features ?? []).find((el) => el.key === 'Average Overall Rating');
  if (averageRating) {
    return Math.round((_.sum((averageRating?.value ?? []).map((el) => +el)) ?? 0
        / (averageRating?.value ?? []).length) * 2) || 0;
  }
  return Math.round((_.sumBy(product?.reviews, 'rating') ?? 0
      / (product?.reviews ?? []).length) * 2) || 0;
};

const checkRatingFields = async ({ dbObject, dfObject }) => {
  if (!dfObject.rating || dfObject.rating > 10) return;

  const searchFields = {
    [OBJECT_TYPES.PRODUCT]: 'Value',
    [OBJECT_TYPES.BOOK]: 'Rating',
    [OBJECT_TYPES.RESTAURANT]: 'Value',
    [OBJECT_TYPES.BUSINESS]: 'Overall',
    default: 'Value',
  };

  const searchFieldBody = searchFields[dbObject.object_type] || searchFields.default;

  const field = (dbObject?.fields ?? [])
    .find((f) => f.name === OBJECT_FIELDS.RATING && f.body === searchFieldBody);
  if (!field) return;
  const alreadyVoted = (field?.rating_votes ?? []).find((v) => v.voter === dfObject.user);
  if (alreadyVoted) return;
  const json = JSON.stringify({
    author: field.author,
    permlink: field.permlink,
    author_permlink: dbObject.author_permlink,
    rate: dfObject.rating,
  });

  const { result, error } = await broadcastJson({
    id: 'wobj_rating',
    required_posting_auths: [dfObject.user],
    json,
    key: process.env.FIELD_VOTES_BOT_KEY,
  });
  if (error || !result) return;

  await DatafinityObject.updateOne(
    { _id: dfObject._id },
    { rating: 0 },
  );
};

module.exports = {
  filterImportObjects,
  getVoteCost,
  bufferToArray,
  needToSaveObject,
  prepareObjectForImport,
  specialFieldsHelper,
  validateSameFields,
  checkAddress,
  getVoteCostInitial,
  capitalizeEachWord,
  checkObjectExist,
  createReversedJSONStringArray,
  createAsinVariations,
  checkObjectExistsByBodyArray,
  shortestString,
  isValidHttpUrl,
  getProductRating,
  checkRatingFields,
  isUserInWhitelist,
};
