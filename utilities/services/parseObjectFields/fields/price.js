const _ = require('lodash');
const { CURRENCY_PREFIX, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  if (!object.mostRecentPriceAmount || !object.mostRecentPriceCurrency) {
    const lastPrice = _.maxBy(_.get(object, 'prices'), (p) => _.get(p, 'dateSeen[0]'));
    if (!lastPrice) return;

    const currencyPrefix = CURRENCY_PREFIX[lastPrice.currency] || CURRENCY_PREFIX.default;
    const body = `${currencyPrefix}${lastPrice.amountMax}`;

    return formField({
      fieldName: OBJECT_FIELDS.PRICE,
      user: object.user,
      body,
      locale: object.locale,
    });
  }

  const currencyPrefix = CURRENCY_PREFIX[object.mostRecentPriceCurrency] || CURRENCY_PREFIX.default;

  const body = `${currencyPrefix}${object.mostRecentPriceAmount}`;

  return formField({
    fieldName: OBJECT_FIELDS.PRICE,
    user: object.user,
    body,
    locale: object.locale,
  });
};
