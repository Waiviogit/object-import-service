const Joi = require('joi');
const { AUTHORITY_FIELD_OPTIONS, FIELD_LANGUAGES_TO_NLP } = require('../../constants/objectTypes');

exports.syncTaskSchema = Joi.object().keys({
  userName: Joi.string().required(),
  hostName: Joi.string().hostname().required(),
  authority: Joi.string().valid(...Object.values(AUTHORITY_FIELD_OPTIONS)),
  locale: Joi.string().valid(...Object.keys(FIELD_LANGUAGES_TO_NLP)).default('en-US'),
});

exports.credentialsSchema = Joi.object().keys({
  userName: Joi.string().required(),
  hostName: Joi.string().hostname().required(),
  accessToken: Joi.string().required(),
  apiKey: Joi.string().required(),
  apiSecretKey: Joi.string().required(),
});

exports.stopSyncSchema = Joi.object().keys({
  userName: Joi.string().required(),
  hostName: Joi.string().hostname().required(),
});

exports.appsListSchema = Joi.object().keys({
  userName: Joi.string().required(),
});
