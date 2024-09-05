const { formField } = require('../../../helpers/formFieldHelper');
const { VIRTUAL_FIELDS } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (!object.listAssociations?.length) return;

  return object.listAssociations.map((el) => ({
    ...formField({
      fieldName: VIRTUAL_FIELDS.ADD_TO_LIST,
      locale: object.locale,
      user: object.user,
      body: el,
    }),
    connectedObject: true,
  }));
};
