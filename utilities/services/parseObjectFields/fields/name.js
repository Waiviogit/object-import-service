const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  if (!object.name) return;

  return formField({
    fieldName: OBJECT_FIELDS.NAME,
    locale: object.locale,
    user: object.user,
    body: object.name,
  });
};
