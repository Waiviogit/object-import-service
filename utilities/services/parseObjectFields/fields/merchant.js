const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { checkObjectExist } = require('../../../helpers/importDatafinityHelper');

module.exports = async (object) => {
  if (!object.merchants) return;
  const merchantDatafinitiy = _.find(object.merchants, (m) => !!m.name);
  if (!merchantDatafinitiy) return;

  if (object.merchantLink) {
    const existObject = await checkObjectExist({
      authorPermlink: object.merchantLink,
      type: OBJECT_TYPES.BUSINESS,
    });
    if (existObject) {
      return formField({
        fieldName: OBJECT_FIELDS.MERCHANT,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          name: merchantDatafinitiy.name, authorPermlink: object.merchantLink,
        }),
      });
    }
  }

  return formField({
    fieldName: OBJECT_FIELDS.MERCHANT,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: merchantDatafinitiy.name }),
  });
};
