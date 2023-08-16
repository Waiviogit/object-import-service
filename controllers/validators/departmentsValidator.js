const Joi = require('joi');

exports.departmentsClaimSchema = Joi.object().keys({
  user: Joi.string().required(),
  authorPermlink: Joi.string().required(),
  scanEmbedded: Joi.boolean().default(true),
});

exports.objectDetailsSchema = Joi.object().keys({
  user: Joi.string().required(),
  importId: Joi.string().required(),
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).default(10),
});
