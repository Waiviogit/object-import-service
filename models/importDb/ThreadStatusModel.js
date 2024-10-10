const { ThreadStatus } = require('../../importObjectsDB').models;

const create = async (doc) => {
  try {
    const result = await ThreadStatus.create(doc);
    return { result: result.toObject() };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ThreadStatus.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateMany = async ({ filter, update, options }) => {
  try {
    const result = await ThreadStatus.updateMany(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await ThreadStatus.findOne(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ThreadStatus.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await ThreadStatus.findOneAndUpdate(filter, update, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const getUserImport = async ({ user, importId }) => {
  const { result, error } = await findOne({
    filter: { user, importId },
  });
  if (!result || error) return;
  return result;
};

module.exports = {
  create,
  updateOne,
  findOne,
  updateMany,
  find,
  findOneAndUpdate,
  getUserImport,
};
