const _ = require('lodash');
const uuid = require('uuid');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const supposedUpdatesTranslate = require('../../../../translations/supposedUpdates');
const { translate } = require('../../../helpers/translateHelper');

const tagsForRestaurant = async (object) => {
  if (!object.cuisines) return;
  const fields = [];
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
  return fields;
};

const createWaivioTags = async (object, allFields) => {
  const categories = _.uniq(_.map(object.waivio_tags, 'key'));
  if (!categories.length) return;
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
    const tagCategory = _.find([...allFields, ...categoryFields],
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === key);

    itemFields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body: value,
      tagCategory: key,
      ...(tagCategory && { id: tagCategory.id }),
    }));
  }

  return [...categoryFields, ...itemFields];
};

module.exports = async (object, allFields) => {
  if (object.waivio_tags) return createWaivioTags(object, allFields);
  if (object.object_type === OBJECT_TYPES.RESTAURANT) return tagsForRestaurant(object);
};
