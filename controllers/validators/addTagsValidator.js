const Joi = require('joi');

exports.addTagsSchema = Joi.object().keys({
  user: Joi.string().required(),
  locale: Joi.string().required().default('en-US'),
  authorPermlink: Joi.string().required(),
  scanEmbedded: Joi.boolean().default(true),
});
