const _ = require('lodash');
const { FEATURES_KEYS, OBJECT_FIELDS, OBJECT_TYPES } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');
const {
  makeDescription,
  makeBookDescription,
  makeProductDescription,
  makeBusinessDescription,
  makeDescriptionBasedOnReviews,
  makeLinkDescription,
} = require('../../gptService');
const { parseJson } = require('../../../helpers/jsonHelper');

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
    const content = typeof element === 'string' ? element : _.get(element, 'value');
    if (!content) continue;
    if (content.length > 5000) continue;
    if (content.length < 30) continue;
    if (notGpt && content.includes('</')) continue;

    return content;
  }
  return '';
};

const getDescriptionFromDatafinity = (object) => {
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

const getDescriptionFromBook = async ({ object, allFields = [] }) => {
  if (object.useGPT) {
    const book = object.name;
    const author = allFields
      .filter((f) => f.name === OBJECT_FIELDS.AUTHORS)
      .map((f) => {
        const parsedBody = parseJson(f.body, null);
        return _.get(parsedBody, 'name');
      }).filter((f) => !!f).join(', ');
    const gptDescription = await makeBookDescription({ author, book });
    if (gptDescription) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body: gptDescription,
        locale: object.locale,
      });
    }
  }
  return getDescriptionFromDatafinity(object);
};

const getDescriptionFromBusiness = async (object) => {
  if (object?.reviews?.length) {
    const gptDescription = await makeDescriptionBasedOnReviews({
      reviews: object?.reviews,
      name: object.name,
    });
    if (gptDescription) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body: gptDescription,
        locale: object.locale,
      });
    }
  }

  const descriptionFromObject = getBodyFromDescriptions(object);

  if (descriptionFromObject) {
    return formField({
      fieldName: OBJECT_FIELDS.DESCRIPTION,
      user: object.user,
      body: descriptionFromObject,
      locale: object.locale,
    });
  }
  if (object.useGPT) {
    const gptAnswer = await makeBusinessDescription(object);
    if (gptAnswer) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body: gptAnswer,
        locale: object.locale,
      });
    }
  }
};
const linkDescription = async (object, allFields) => {
  const url = _.find(allFields, (el) => el.name === OBJECT_FIELDS.URL);
  if (url) {
    const gptDescription = await makeLinkDescription(url.body);
    if (gptDescription) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body: gptDescription,
        locale: object.locale,
      });
    }
  }

  if (!object.fieldDescription) return;

  return formField({
    fieldName: OBJECT_FIELDS.DESCRIPTION,
    user: object.user,
    body: object.fieldDescription,
    locale: object.locale,
  });
};

module.exports = async (object, allFields) => {
  if ([OBJECT_TYPES.BUSINESS, OBJECT_TYPES.RESTAURANT].includes(object.object_type)) {
    return getDescriptionFromBusiness(object);
  }
  if (object.object_type === OBJECT_TYPES.LINK) {
    return linkDescription(object, allFields);
  }

  if (object.object_type === OBJECT_TYPES.BOOK) {
    return getDescriptionFromBook({ object, allFields });
  }
  if (object.useGPT) {
    const gptDbAnswer = await makeProductDescription(object.name);
    if (gptDbAnswer) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: object.user,
        body: gptDbAnswer,
        locale: object.locale,
      });
    }

    const featuresBody = getBodyFromFeatures(object);
    const descriptionBody = getBodyFromDescriptions(object, false);
    const reqBody = featuresBody.length > 1000 ? featuresBody : `${featuresBody}.${descriptionBody}`.slice(0, 5000);
    if (featuresBody || descriptionBody) {
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

  return getDescriptionFromDatafinity(object);
};
