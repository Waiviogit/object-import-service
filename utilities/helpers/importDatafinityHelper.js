const _ = require('lodash');
const uuid = require('uuid');
const { WHITE_LIST, VOTE_COST } = require('../../constants/voteAbility');
const { OBJECT_TYPES, PARENT_ASIN_FIELDS, OBJECT_FIELDS } = require('../../constants/objectTypes');
const { parseJson } = require('./jsonHelper');
const { generateUniquePermlink } = require('./permlinkGenerator');
const { addField } = require('../services/importObjectsService');
const { formField } = require('./formFieldHelper');

const getVoteCost = (account) => {
  if (_.includes(WHITE_LIST, account)) return VOTE_COST.FOR_WHITE_LIST;
  return VOTE_COST.USUAL;
};

const groupByAsins = (products, objectType) => {
  const uniqueProducts = [];

  if (objectType === OBJECT_TYPES.BOOK) {
    products = _.filter(
      products,
      (p) => _.some(p.categories, (c) => c.toLocaleLowerCase().includes('book')),
    );
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
        latest.features,
        (f) => _.includes(PARENT_ASIN_FIELDS, f.key),
      );
      if (parentAsin) {
        uniqueProducts.push(latest);
        continue;
      }
      for (const element of grouped[groupedKey]) {
        parentAsin = _.find(
          element.features,
          (f) => _.includes(PARENT_ASIN_FIELDS, f.key),
        );
        if (!parentAsin) continue;
        if (!latest.features) {
          latest.features = [parentAsin];
          break;
        }
        latest.features.push(parentAsin);
      }
      uniqueProducts.push(latest);
      continue;
    }
    uniqueProducts.push(grouped[groupedKey][0]);
  }
  return uniqueProducts;
};

const filterImportRestaurants = (restaurants) => _.reduce(restaurants, (acc, el) => {
  const someRestaurants = _.some(el.categories, (category) => category.toLocaleLowerCase().includes('restaurant'));
  if (!someRestaurants) return acc;
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

const filterImportObjects = ({
  products, objectType,
}) => {
  const filters = {
    restaurant: filterImportRestaurants,
    book: groupByAsins,
    product: groupByAsins,
    default: () => products,
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
  const permlink = datafinityObject.author_permlink ? datafinityObject.author_permlink : await generateUniquePermlink(datafinityObject.name);

  return {
    object_type: datafinityObject.object_type,
    author_permlink: permlink,
    creator: datafinityObject.user,
    default_name: datafinityObject.name,
    locale: datafinityObject.locale,
    is_extending_open: true,
    is_posting_open: true,
    fields: datafinityObject.fields,
    datafinityObject: true,
  };
};

const specialFieldsHelper = async ({ datafinityObject, wobject }) => {
  const field = datafinityObject.fields[0];
  if (field.name === OBJECT_FIELDS.CATEGORY_ITEM) {
    const existingCategory = _.find(wobject.fields,
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === field.tagCategory);
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

const validateSameFields = ({ fieldData, wobject }) => {
  const setUniqFields = ['name', 'body', 'locale'];

  const foundedFields = _.map(wobject.fields, (field) => _.pick(field, setUniqFields));
  const result = foundedFields.find((field) => _.isEqual(field, _.pick(fieldData, setUniqFields)));
  return !!result;
};

const checkAddress = (object) => /[0-9]/.test(_.get(object, 'address', ''));

module.exports = {
  filterImportObjects,
  getVoteCost,
  bufferToArray,
  needToSaveObject,
  prepareObjectForImport,
  specialFieldsHelper,
  validateSameFields,
  checkAddress,
};
