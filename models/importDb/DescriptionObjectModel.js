const { DescriptionObject } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await DescriptionObject.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const count = async ({ filter, options }) => {
  try {
    const result = await DescriptionObject.count(filter, options);

    return { count: result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await DescriptionObject.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await DescriptionObject.find(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await DescriptionObject.updateOne(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await DescriptionObject.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await DescriptionObject.countDocuments(filter, options);
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
