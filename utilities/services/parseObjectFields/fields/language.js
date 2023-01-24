const _ = require('lodash');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const lang = _.find(object.features, (el) => el.key.toLowerCase() === OBJECT_FIELDS.LANGUAGE);

  if (!lang) return;
  return formField({
    fieldName: OBJECT_FIELDS.LANGUAGE,
    body: lang.value.length ? lang.value[0] : lang.value,
    user: object.user,
    locale: object.locale,
  });
};
