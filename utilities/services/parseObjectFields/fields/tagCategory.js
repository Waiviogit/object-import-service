const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const supposedUpdatesTranslate = require('../../../../translations/supposedUpdates');
const { translate } = require('../../../helpers/translateHelper');

module.exports = async (object) => {
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
