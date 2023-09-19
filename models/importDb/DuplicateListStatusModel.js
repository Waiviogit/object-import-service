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

module.exports = {
  create,
  updateOne,
};
