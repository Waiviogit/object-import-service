const Joi = require('joi');

exports.duplicateListSchema = Joi.object().keys({
  user: Joi.string().required(),
  authorPermlink: Joi.string().required(),
  scanEmbedded: Joi.boolean().default(true),
});
