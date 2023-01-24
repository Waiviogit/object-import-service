const _ = require('lodash');
const { FEATURES_KEYS, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  if (!object.descriptions || !Array.isArray(object.descriptions)) {
    const features = _.find(object.features, (f) => f.key === FEATURES_KEYS.PRODUCT_FEATURES);
    if (!features) return;
    let body = '';
    for (const featuresValue of features.value) {
      if (body.length + featuresValue.length < 5000) {
        body.length ? body += `. ${featuresValue}` : body += featuresValue;
      }
    }
    if (body) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body,
        locale: object.locale,
      });
    }
    return;
  }
  for (const element of object.descriptions) {
    const content = _.get(element, 'value');
    if (!content) continue;
    if (content.length > 5000) continue;
    if (content.length < 30) continue;
    if (content.includes('<')) continue;

    return formField({
      fieldName: OBJECT_FIELDS.DESCRIPTION,
      user: object.user,
      body: content,
      locale: object.locale,
    });
  }
};
