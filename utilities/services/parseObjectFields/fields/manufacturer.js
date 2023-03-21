const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { checkObjectExist } = require('../../../helpers/importDatafinityHelper');

module.exports = async (object) => {
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

  return formField({
    fieldName: OBJECT_FIELDS.MANUFACTURER,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.manufacturer }),
  });
};
