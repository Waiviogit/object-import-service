const _ = require('lodash');
const { FEATURES_FILTER, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const datafinityFeatures = _.filter(object.features, (f) => !_.includes(FEATURES_FILTER, f.key));
  if (_.isEmpty(datafinityFeatures)) return;
  const fields = [];
  for (const feature of datafinityFeatures) {
    if (feature.value.length > 1) continue;
    fields.push(formField({
      fieldName: OBJECT_FIELDS.FEATURES,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({ key: feature.key, value: feature.value[0] }),
    }));
  }

  return fields;
};
