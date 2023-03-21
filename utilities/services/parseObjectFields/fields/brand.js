const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { checkObjectExist } = require('../../../helpers/importDatafinityHelper');

module.exports = async (object) => {
  if (!object.brand) return;
  if (object.brandLink) {
    const existObject = await checkObjectExist({
      authorPermlink: object.brandLink,
      type: OBJECT_TYPES.BUSINESS,
    });
    if (existObject) {
      return formField({
        fieldName: OBJECT_FIELDS.BRAND,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({ name: object.brand, authorPermlink: object.brandLink }),
      });
    }
  }

  return formField({
    fieldName: OBJECT_FIELDS.BRAND,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.brand }),
  });
};
