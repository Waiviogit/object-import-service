const _ = require('lodash');
const uuid = require('uuid');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const supposedUpdatesTranslate = require('../../../../translations/supposedUpdates');
const { translate } = require('../../../helpers/translateHelper');
const { gptTagsFromDescription } = require('../../gptService');

const getTagsFromDescription = async (object, allFields) => {
  if (!object.useGPT) return;
  const description = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.DESCRIPTION,
  );
  if (!description) return;

  const fields = [];
  const tagCategories = {
    product: 'Pros',
    business: 'Pros',
    restaurant: 'Features',
    book: 'Tags',
    default: 'Pros',
  };

  const category = tagCategories[object.object_type] || tagCategories.default;
  const preCreated = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === category,
  );
  if (!preCreated) {
    fields.push(
      formField({
        fieldName: OBJECT_FIELDS.TAG_CATEGORY,
        locale: object.locale,
        user: object.user,
        body: category,
        id: uuid.v4(),
      }),
    );
  }

  const { result, error } = await gptTagsFromDescription({ content: description.body });
  if (error || !result?.length) return;

  for (const tag of result) {
    const tagCategory = _.find(
      [...allFields, ...fields],
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === category,
    );
    const sameTag = _.find(
      allFields,
      (f) => f.name === OBJECT_FIELDS.CATEGORY_ITEM && f.body === tag,
    );
    if (sameTag) continue;
    if (!tagCategory) continue;

    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body: tag,
      tagCategory: category,
      id: tagCategory.id,
    }));
  }

  return fields;
};

const tagsForRestaurant = async (object, allFields) => {
  const fields = [];
  if (!object.cuisines) {
    const gptFields = await getTagsFromDescription(object, allFields);
    if (gptFields)fields.push(...gptFields);
    if (fields.length) return fields;
    return;
  }

  if (object.locale === 'en-US') {
    for (const cuisine of object.cuisines) {
      const body = cuisine.toLocaleLowerCase();
      fields.push(formField({
        fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
        locale: object.locale,
        user: object.user,
        body,
        tagCategory: supposedUpdatesTranslate.Cuisine[object.locale],
      }));
    }
    const gptFields = await getTagsFromDescription(object, [...allFields, ...fields]);
    if (gptFields)fields.push(...gptFields);
    return fields;
  }
  for (const cuisine of object.cuisines) {
    let body = cuisine.toLocaleLowerCase();
    if (object.translate) {
      const { error, result } = await translate({
        text: cuisine.toLocaleLowerCase(),
        source: 'en-US',
        target: object.locale,
      });
      if (error || !result) continue;
      body = result;
    }

    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body,
      tagCategory: supposedUpdatesTranslate.Cuisine[object.locale],
    }));
  }
  if (_.isEmpty(fields)) return;
  const gptFields = await getTagsFromDescription(object, [...allFields, ...fields]);
  if (gptFields)fields.push(...gptFields);
  return fields;
};

const createWaivioTags = async (object, allFields) => {
  const fields = [];
  const categories = _.uniq(_.map(object.waivio_tags, 'key'));
  if (!categories.length) {
    const gptFields = await getTagsFromDescription(object, [...allFields, ...fields]);
    if (gptFields)fields.push(...gptFields);

    return fields;
  }
  const categoryFields = [];
  const itemFields = [];
  for (const category of categories) {
    const preCreated = _.find(
      allFields,
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === category,
    );
    if (!preCreated) {
      categoryFields.push(
        formField({
          fieldName: OBJECT_FIELDS.TAG_CATEGORY,
          locale: object.locale,
          user: object.user,
          body: category,
          id: uuid.v4(),
        }),
      );
    }
  }

  for (const tag of object.waivio_tags) {
    const { key = '', value = '' } = tag;
    if (!key || !value) continue;
    const tagCategory = _.find(
      [...allFields, ...categoryFields],
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === key,
    );

    itemFields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body: value,
      tagCategory: key,
      ...(tagCategory && { id: tagCategory.id }),
    }));
  }
  fields.push(...categoryFields, ...itemFields);
  const gptFields = await getTagsFromDescription(object, [...allFields, ...fields]);
  if (gptFields)fields.push(...gptFields);
  return fields;
};

const addDefaultTags = async (object, allFields) => {
  const gptFields = await getTagsFromDescription(object, allFields);
  if (gptFields) {
    return gptFields;
  }
};

module.exports = async (object, allFields) => {
  if (object.waivio_tags) return createWaivioTags(object, allFields);
  if (object.object_type === OBJECT_TYPES.RESTAURANT) return tagsForRestaurant(object, allFields);

  return addDefaultTags(object, allFields);
};
