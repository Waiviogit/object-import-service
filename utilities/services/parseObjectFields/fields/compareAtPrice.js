const { FIELDS_NAMES } = require('@waivio/objects-processor');
const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = async (object) => {
  if (_.isEmpty(object.fieldCompareAtPrice)) return;

  return formField({
    fieldName: FIELDS_NAMES.COMPARE_AT_PRICE,
    locale: object.locale,
    user: object.user,
    body: object.fieldCompareAtPrice,
  });
};
