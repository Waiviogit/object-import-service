const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  if (!object.merchants) return;

  const merchantDatafinitiy = _.find(object.merchants, (m) => !!m.name);
  if (!merchantDatafinitiy) return;

  return formField({
    fieldName: OBJECT_FIELDS.MERCHANT,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: merchantDatafinitiy.name }),
  });
};
