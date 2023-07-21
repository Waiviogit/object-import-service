const Joi = require('joi');
const { AUTHORITY_FIELD_OPTIONS } = require('../../constants/objectTypes');

exports.authorityClaimSchema = Joi.object().keys({
  user: Joi.string().required(),
  authorPermlink: Joi.string().required(),
  authority: Joi.string().valid(...Object.values(AUTHORITY_FIELD_OPTIONS))
    .default(AUTHORITY_FIELD_OPTIONS.ADMINISTRATIVE),

});

exports.objectDetailsSchema = Joi.object().keys({
  user: Joi.string().required(),
  importId: Joi.string().required(),
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).default(10),
});
