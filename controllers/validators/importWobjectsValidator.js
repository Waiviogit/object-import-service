const Joi = require('joi');
const { OBJECT_TYPES, AUTHORITY_FIELD_OPTIONS } = require('../../constants/objectTypes');
const { IMPORT_STATUS } = require('../../constants/appData');

exports.importDatafinityObjectsSchema = Joi.object().keys({
  user: Joi.string().required(),
  objectType: Joi.string().valid(...Object.values(OBJECT_TYPES)).default(OBJECT_TYPES.BOOK),
  authority: Joi.string().valid(...Object.values(AUTHORITY_FIELD_OPTIONS)),
  importName: Joi.string(),
  minVotingPower: Joi.number().min(1).max(10000).default(7000),
});

exports.importStatisticsSchema = Joi.object().keys({
  user: Joi.string().required(),
});

exports.importStatusSchema = Joi.object().keys({
  user: Joi.string().required(),
  status: Joi.string().valid(IMPORT_STATUS.ACTIVE, IMPORT_STATUS.ON_HOLD),
  name: Joi.string(),
  importId: Joi.string().required(),
  minVotingPower: Joi.number().min(1).max(10000),
}).or('status', 'name', 'minVotingPower');

exports.deleteImportSchema = Joi.object().keys({
  user: Joi.string().required(),
  importId: Joi.string().required(),
});
