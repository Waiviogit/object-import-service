const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { checkObjectExist } = require('../../../helpers/importDatafinityHelper');
const { parseJson } = require('../../../helpers/jsonHelper');

module.exports = async (object, allFields) => {
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

  const brand = _.find(allFields, (f) => f.name === OBJECT_FIELDS.BRAND);
  const manufacturer = _.find(allFields, (f) => f.name === OBJECT_FIELDS.MANUFACTURER);
  const parsedBrand = parseJson(brand?.body, null);
  const parsedManufacturer = parseJson(manufacturer?.body, null);

  if (
    parsedBrand?.name === merchantDatafinitiy.name
      || parsedManufacturer?.name === merchantDatafinitiy.name
  ) return;

  return formField({
    fieldName: OBJECT_FIELDS.MERCHANT,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: merchantDatafinitiy.name }),
  });
};
