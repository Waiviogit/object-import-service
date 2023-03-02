const _ = require('lodash');
const { PARENT_ASIN_FIELDS, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const ids = [];

  for (const feature of _.get(object, 'features', [])) {
    if (!_.includes(PARENT_ASIN_FIELDS, feature.key)) continue;
    for (const groupID of feature.value) {
      ids.push(groupID.replace('‎ ', ''));
    }
  }
  if (_.isEmpty(ids)) return;

  return _.map(_.uniq(ids), (id) => formField({
    fieldName: OBJECT_FIELDS.GROUP_ID,
    user: object.user,
    body: id,
    locale: object.locale,
  }));
};
