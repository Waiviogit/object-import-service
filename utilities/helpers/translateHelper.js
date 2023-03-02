const NLPCloudClient = require('nlpcloud');
const _ = require('lodash');
const { FIELD_LANGUAGES_TO_NLP } = require('../../constants/objectTypes');

const token = process.env.NLP_CLOUD_TOKEN;

const clientTranslate = new NLPCloudClient('nllb-200-3-3b', token);

exports.translate = async ({ text, source = '', target }) => {
  try {
    const sourceLang = FIELD_LANGUAGES_TO_NLP[source] || '';
    const targetLang = FIELD_LANGUAGES_TO_NLP[target] || FIELD_LANGUAGES_TO_NLP.default;
    const response = await clientTranslate.translation(text, sourceLang, targetLang);
    return { result: _.get(response, 'data.translation_text') };
  } catch (error) {
    return { error };
  }
};
