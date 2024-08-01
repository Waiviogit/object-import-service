const { TagsObject } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await TagsObject.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const count = async ({ filter, options }) => {
  try {
    const result = await TagsObject.count(filter, options);

    return { count: result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await TagsObject.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await TagsObject.find(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await TagsObject.updateOne(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await TagsObject.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await TagsObject.countDocuments(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  findOne,
  insertMany,
  count,
  updateOne,
  deleteMany,
  find,
  countDocuments,
};
