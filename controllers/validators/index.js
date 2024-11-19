exports.importWobjects = require('./importWobjectsValidator');
exports.authority = require('./authorityValidator');
exports.departments = require('./departmentsValidator');
exports.duplicateList = require('./duplicateListValidator');
exports.addTags = require('./addTagsValidator');
exports.threadValidator = require('./threadValidator');
exports.postImportValidator = require('./postImportValidator');

exports.validate = (data, schema, next) => {
  const result = schema.validate(data, { abortEarly: false });

  if (result.error) {
    const error = { status: 422, message: result.error.message };
    return next(error);
  }
  return result.value;
};
