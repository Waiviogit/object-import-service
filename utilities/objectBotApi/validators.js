const _ = require('lodash');
const { Wobj, ObjectType } = require('../../models');

const CREATE_OBJECT_TYPE_REQUIRED_FIELDS = 'objectType'.split(',');
const CREATE_OBJECT_REQUIRED_FIELDS = 'author,title,body,permlink,objectName,locale,isExtendingOpen,isPostingOpen,parentAuthor,parentPermlink'.split(',');
const APPEND_OBJECT_REQUIRED_FIELD = 'author,permlink,parentAuthor,parentPermlink,body,title,field'.split(',');

const createObjectTypeValidate = async (data) => {
  for (const field of CREATE_OBJECT_TYPE_REQUIRED_FIELDS) {
    if (_.isNil(data[field])) {
      return { error: { message: `Create Object Type data is not valid, "${field}" field not found!` } };
    }
  }
  const { objectType } = await ObjectType.getOne({ name: _.get(data, 'objectType') });

  if (objectType) {
    return { error: { message: `Create Object Type data is not valid, "${objectType.name}" Object Type already exist!` } };
  }
  return { isValid: true };
};

const createObjectValidate = async (data) => {
  for (const field of CREATE_OBJECT_REQUIRED_FIELDS) {
    if (_.isNil(data[field])) {
      return { error: { message: `Create Object data is not valid, ${field} field not found!` } };
    }
  }

  const { wobject } = await Wobj.getOne({ author_permlink: _.get(data, 'permlink') });

  if (wobject) {
    return { error: { message: `Create Object data is not valid, "${wobject.author_permlink}" Object already exist!` } };
  }
  return { isValid: true };
};

const appendObjectValidate = async (data) => {
  for (const field of APPEND_OBJECT_REQUIRED_FIELD) {
    if (_.isNil(data[field])) {
      return { error: { message: `Append Object data is not valid, ${field} field not found!` } };
    }
  }
  const REQUIRED_FIELD_FIELDS = 'name,body,locale'.split(',');

  for (const field of REQUIRED_FIELD_FIELDS) {
    if (_.isNil(data.field[field])) {
      return { error: { message: `Append Object data is not valid, field.${field} field not found!` } };
    }
  }
  const { field } = await Wobj.getField({
    author_permlink: _.get(data, 'parentPermlink'),
    permlink: _.get(data, 'permlink'),
  });

  if (field) {
    return { error: { message: `Create Object data is not valid, "${field.name}" Wobject Field already exist!` } };
  }
  return { isValid: true };
};

const validateImmediatelyImport = (req) => {
  if (req.body.immediately) {
    if (req.headers['api-key']) {
      const { API_KEY } = process.env;

      if (API_KEY !== req.headers['api-key']) {
        return false;
      }
      return true;
    }
    return false;
  }
  return true;
};

module.exports = {
  createObjectTypeValidate,
  createObjectValidate,
  appendObjectValidate,
  validateImmediatelyImport,
};
