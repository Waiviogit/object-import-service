const { DepartmentsObject } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await DepartmentsObject.insertMany(docs);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await DepartmentsObject.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await DepartmentsObject.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await DepartmentsObject.updateOne(filter, update, options);
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

const updateToClaimedObject = async ({ user, importId, authorPermlink, department }) => {
  const { result } = await updateOne({
    filter: {
      user, importId, authorPermlink, department,
    },
    update: { claim: true },
  });

  return !!result?.nModified;
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await DepartmentsObject.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const count = async ({ filter, options }) => {
  try {
    const result = await DepartmentsObject.count(filter, options);
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
  count,
};
