const { DatafinityObject } = require('../database').models;

const insertMany = async (docs) => {
  try {
    const result = await DatafinityObject.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const getOne = async (filter) => {
  try {
    const datafinityObject = await DatafinityObject.findOne(filter).lean();

    return { datafinityObject };
  } catch (error) {
    return { error };
  }
};

const updateOne = async (filter, update) => {
  try {
    const result = await DatafinityObject.updateOne(filter, update);

    return { result };
  } catch (error) {
    return { error };
  }
};

const removeOne = async (id) => {
  try {
    await DatafinityObject.remove({ _id: id });
  } catch (error) {
    return { error };
  }
};

const create = async (docs) => {
  try {
    const result = await DatafinityObject.create(docs);

    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndModify = async (filter, update) => {
  try {
    const result = await DatafinityObject.findOneAndUpdate(filter, update);

    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  insertMany, getOne, updateOne, removeOne, create, findOneAndModify,
};
