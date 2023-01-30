const _ = require('lodash');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const age = _.find(object.features, (el) => el.key.toLowerCase()
    .replace(' ', '') === OBJECT_FIELDS.AGE_RANGE.toLowerCase());

  if (!age) return;

  return formField({
    fieldName: OBJECT_FIELDS.AGE_RANGE,
    user: object.user,
    body: age.value.length ? age.value[0] : age.value,
    locale: object.locale,
  });
};
