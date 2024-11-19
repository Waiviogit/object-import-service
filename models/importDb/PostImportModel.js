const { PostImport } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await PostImport.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await PostImport.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await PostImport.find(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await PostImport.updateOne(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await PostImport.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteOne = async ({ filter, options }) => {
  try {
    const result = await PostImport.deleteOne(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await PostImport.countDocuments(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  findOne,
  insertMany,
  updateOne,
  deleteMany,
  find,
  countDocuments,
  deleteOne,
};
