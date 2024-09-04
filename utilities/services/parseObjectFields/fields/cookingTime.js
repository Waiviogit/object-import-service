const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (_.isEmpty(object.fieldCookingTime)) return;

  return formField({
    fieldName: OBJECT_FIELDS.COOKING_TIME,
    locale: object.locale,
    user: object.user,
    body: object.fieldCookingTime,
  });
};