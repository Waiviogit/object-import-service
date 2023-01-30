const _ = require('lodash');
const { PARENT_ASIN_FIELDS, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const parentAsin = _.find(_.get(object, 'features'),
    (f) => _.includes(PARENT_ASIN_FIELDS, f.key));
  if (!parentAsin) return;

  const body = _.get(parentAsin, 'value[0]', '').replace('‎ ', '');
  if (!body) return;

  return formField({
    fieldName: OBJECT_FIELDS.GROUP_ID,
    user: object.user,
    body,
    locale: object.locale,
  });
};
