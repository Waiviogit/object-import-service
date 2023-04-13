const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { checkObjectExist } = require('../../../helpers/importDatafinityHelper');
const { parseJson } = require('../../../helpers/jsonHelper');

module.exports = async (object, allFields) => {
  if (!object.manufacturer) return;
  if (object.manufacturerLink) {
    const existObject = await checkObjectExist({
      authorPermlink: object.manufacturerLink,
      type: OBJECT_TYPES.BUSINESS,
    });
    if (existObject) {
      return formField({
        fieldName: OBJECT_FIELDS.MANUFACTURER,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify(
          { name: object.manufacturer, authorPermlink: object.manufacturerLink },
        ),
      });
    }
  }

  const brand = _.find(allFields, (f) => f.name === OBJECT_FIELDS.BRAND);
  const parsedBrand = parseJson(brand.body, null);
  if (parsedBrand?.name === object.manufacturer) return;

  return formField({
    fieldName: OBJECT_FIELDS.MANUFACTURER,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.manufacturer }),
  });
};
