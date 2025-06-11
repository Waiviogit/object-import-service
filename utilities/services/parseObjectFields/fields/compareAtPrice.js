const { FIELDS_NAMES } = require('@waivio/objects-processor');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, CURRENCY_PREFIX } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (object.fieldCompareAtPrice) {
    return formField({
      fieldName: FIELDS_NAMES.COMPARE_AT_PRICE,
      locale: object.locale,
      user: object.user,
      body: object.fieldCompareAtPrice,
    });
  }

  if (object.mostRecentPriceCurrency && object.compareAtPriceAmount) {
    const currencyPrefix = CURRENCY_PREFIX[object.mostRecentPriceCurrency] || CURRENCY_PREFIX.default;
    const body = `${currencyPrefix}${object.compareAtPriceAmount}`;

    return formField({
      fieldName: OBJECT_FIELDS.COMPARE_AT_PRICE,
      user: object.user,
      body,
      locale: object.locale,
    });
  }
};
