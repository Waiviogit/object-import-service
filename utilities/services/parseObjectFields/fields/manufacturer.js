const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  if (!object.manufacturer) return;

  return formField({
    fieldName: OBJECT_FIELDS.MANUFACTURER,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.manufacturer }),
  });
};
