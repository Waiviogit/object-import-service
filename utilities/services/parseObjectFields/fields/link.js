const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

const getLinks = (object) => {
  if (!object?.socialLinks) return;

  return formField({
    fieldName: OBJECT_FIELDS.LINK,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify(object?.socialLinks),
  });
};

module.exports = getLinks;
