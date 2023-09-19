const { DuplicateListStatus } = require('../../importObjectsDB').models;

const create = async (doc) => {
  try {
    const result = await DuplicateListStatus.create(doc);
    return { result: result.toObject() };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await DuplicateListStatus.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateMany = async ({ filter, update, options }) => {
  try {
    const result = await DuplicateListStatus.updateMany(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await DuplicateListStatus.findOne(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await DuplicateListStatus.find(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await DuplicateListStatus.findOneAndUpdate(filter, update, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  create,
  updateOne,
  findOne,
  updateMany,
  find,
  findOneAndUpdate,
};
