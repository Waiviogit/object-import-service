const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  const printLen = _.find(object.features, (el) => el.key.toLowerCase().includes('pages'));

  if (!printLen) return;
  return formField({
    fieldName: OBJECT_FIELDS.PRINT_LENGTH,
    body: printLen.value[0].split(' ')[0],
    user: object.user,
    locale: object.locale,
  });
};
