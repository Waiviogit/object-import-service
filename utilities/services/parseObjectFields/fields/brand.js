const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  if (!object.brand) return;

  return formField({
    fieldName: OBJECT_FIELDS.BRAND,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.brand }),
  });
};
