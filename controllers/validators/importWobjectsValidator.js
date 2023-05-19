const Joi = require('joi');
const { AUTHORITY_FIELD_OPTIONS, IMPORT_OBJECT_TYPES, FIELD_LANGUAGES_TO_NLP } = require('../../constants/objectTypes');
const { IMPORT_STATUS } = require('../../constants/appData');

exports.importDatafinityObjectsSchema = Joi.object().keys({
  user: Joi.string().required(),
  objectType: Joi.string().valid(...Object.values(IMPORT_OBJECT_TYPES)).required(),
  authority: Joi.string().valid(...Object.values(AUTHORITY_FIELD_OPTIONS)),
  locale: Joi.string().valid(...Object.keys(FIELD_LANGUAGES_TO_NLP)).default('en-US'),
  translate: Joi.boolean().default(false),
  useGPT: Joi.boolean().default(false),
  forceImport: Joi.boolean().default(false),
});

exports.importStatisticsSchema = Joi.object().keys({
  user: Joi.string().required(),
});

exports.importStatusSchema = Joi.object().keys({
  user: Joi.string().required(),
  status: Joi.string().valid(IMPORT_STATUS.ACTIVE, IMPORT_STATUS.ON_HOLD).required(),
  importId: Joi.string().required(),
});

exports.deleteImportSchema = Joi.object().keys({
  user: Joi.string().required(),
  importId: Joi.string().required(),
});

exports.minVotingPowerSchema = Joi.object().keys({
  minVotingPower: Joi.number().min(1).max(10000).required(),
  user: Joi.string().required(),
});

exports.getPowerSchema = Joi.object().keys({
  user: Joi.string().required(),
});

exports.getAsinsSchema = Joi.object().keys({
  uri: Joi.string().uri().required(),
});

exports.getNotPublishedAsinsSchema = Joi.object().keys({
  asins: Joi.array().items(Joi.string()),
});
