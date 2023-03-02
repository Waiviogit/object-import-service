const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { checkAddress } = require('../../../helpers/importDatafinityHelper');

module.exports = async (object) => {
  const validAddress = checkAddress(object);
  if (!validAddress) return;

  return formField({
    fieldName: OBJECT_FIELDS.ADDRESS,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({
      address: _.get(object, 'address', ''),
      city: _.get(object, 'city', ''),
      state: _.get(object, 'province', ''),
      postalCode: _.get(object, 'postalCode', ''),
      country: _.get(object, 'country', ''),
    }),
  });
};
