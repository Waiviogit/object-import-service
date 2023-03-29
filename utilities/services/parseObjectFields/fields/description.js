const _ = require('lodash');
const { FEATURES_KEYS, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');
const { makeDescription } = require('../../gptService');

const getBodyFromFeatures = (object) => {
  const features = _.find(object.features, (f) => f.key === FEATURES_KEYS.PRODUCT_FEATURES);
  if (!features) return '';
  let body = '';
  for (const featuresValue of features.value) {
    if (body.length + featuresValue.length < 5000) {
      body.length ? body += `. ${featuresValue}` : body += featuresValue;
    }
  }
  return body;
};

const getBodyFromDescriptions = (object, notGpt = true) => {
  for (const element of _.get(object, 'descriptions', [])) {
    const content = _.get(element, 'value');
    if (!content) continue;
    if (content.length > 5000) continue;
    if (content.length < 30) continue;
    if (notGpt && content.includes('<')) continue;

    return content;
  }
  return '';
};

module.exports = async (object) => {
  if (object.useGPT) {
    const featuresBody = getBodyFromFeatures(object);
    const descriptionBody = getBodyFromDescriptions(object, false);
    const reqBody = featuresBody.length > 1000 ? featuresBody : `${featuresBody}.${descriptionBody}`.slice(0, 5000);
    if (reqBody) {
      const gptDescription = await makeDescription(reqBody);
      if (gptDescription) {
        return formField({
          fieldName: OBJECT_FIELDS.DESCRIPTION,
          user: object.user,
          body: gptDescription,
          locale: object.locale,
        });
      }
    }
  }

  if (!object.descriptions || !Array.isArray(object.descriptions)) {
    const body = getBodyFromFeatures(object);
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

  const fromDescription = getBodyFromDescriptions(object);
  if (fromDescription) {
    return formField({
      fieldName: OBJECT_FIELDS.DESCRIPTION,
      user: object.user,
      body: fromDescription,
      locale: object.locale,
    });
  }
};
