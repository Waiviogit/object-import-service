const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (object.workingHours) {
    return formField({
      fieldName: OBJECT_FIELDS.WORK_TIME,
      locale: object.locale,
      user: object.user,
      body: object.workingHours,
    });
  }

  if (_.isEmpty(object.hours)) return;
  const body = _.reduce(object.hours, (acc, el) => `${acc}${el.day} ${el.hour}\n`, '');

  return formField({
    fieldName: OBJECT_FIELDS.WORK_TIME,
    locale: object.locale,
    user: object.user,
    body,
  });
};
