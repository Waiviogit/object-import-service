const { DuplicateListObject } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await DuplicateListObject.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const count = async ({ filter, options }) => {
  try {
    const result = await DuplicateListObject.count(filter, options);

    return { count: result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await DuplicateListObject.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await DuplicateListObject.updateOne(filter, update, options);

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
};
