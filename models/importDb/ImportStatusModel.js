const { ImportStatus } = require('../../importObjectsDB').models;

const create = async (doc) => {
  try {
    const result = await ImportStatus.create(doc);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await ImportStatus.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ImportStatus.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ImportStatus.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateMany = async ({ filter, update, options }) => {
  try {
    const result = await ImportStatus.updateMany(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndDelete = async ({ filter, options }) => {
  try {
    const result = await ImportStatus.findOneAndDelete(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await ImportStatus.findOneAndUpdate(filter, update, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  find, findOne, updateOne, findOneAndDelete, create, findOneAndUpdate, updateMany,
};
