const { AuthorityObject } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await AuthorityObject.insertMany(docs);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await AuthorityObject.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await AuthorityObject.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await AuthorityObject.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const getNextObject = async ({ user, importId }) => {
  const { result, error } = await findOne({
    filter: { user, importId, claim: false },
  });
  if (!result || error) return;
  return result;
};

const updateToClaimedObject = async ({ user, importId, authorPermlink }) => {
  const { result } = await updateOne({
    filter: { user, importId, authorPermlink },
    update: { claim: true },
  });

  return !!result?.nModified;
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await AuthorityObject.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await AuthorityObject.countDocuments(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  insertMany,
  findOne,
  getNextObject,
  updateOne,
  updateToClaimedObject,
  find,
  deleteMany,
  countDocuments,
};
