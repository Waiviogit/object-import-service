const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (_.isEmpty(object.websites)) return;

  return formField({
    fieldName: OBJECT_FIELDS.WEBSITE,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ title: `${object.name} Website`, link: object.websites[0] }),
  });
};
