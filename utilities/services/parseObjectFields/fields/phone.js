const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

const getPhone = (object) => {
  if (!object?.phone) return;

  return {
    ...formField({
      fieldName: OBJECT_FIELDS.PHONE,
      locale: object.locale,
      user: object.user,
      body: 'phone',
    }),
    number: object?.phone,
  };
};

module.exports = getPhone;
