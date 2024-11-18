const Joi = require('joi');

exports.postImportSchema = Joi.object().keys({
  user: Joi.string().required(),
  host: Joi.string(),
  dailyLimit: Joi.number().integer().min(0).default(0),
  posts: Joi.array().items(Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()),
  })),
});

exports.postHostSchema = Joi.object().keys({
  host: Joi.string(),
  user: Joi.string().required(),
});
