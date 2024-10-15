const Joi = require('joi');

exports.threadTaskSchema = Joi.object().keys({
  groupPermlink: Joi.string().required(),
  pagePermlink: Joi.string().required(),
  limit: Joi.number().integer().min(0).default(0),
  skip: Joi.number().integer().min(0).default(0),
  user: Joi.string().required(),
  avoidRepetition: Joi.boolean().default(true),
  locale: Joi.string().default('en-US'),
});

exports.minRcSchema = Joi.object().keys({
  minRc: Joi.number().min(1).max(10000).required(),
  user: Joi.string().required(),
});
