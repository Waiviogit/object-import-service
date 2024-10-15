const { IMPORT_STATUS } = require('../../constants/appData');
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

const getPendingImport = async ({ user }) => {
  const { result } = await findOne({
    filter: { user, status: IMPORT_STATUS.PENDING },
  });
  if (!result) return;
  await updateOne({
    filter: {
      _id: result._id,
    },
    update: { status: IMPORT_STATUS.ACTIVE },
  });

  return result;
};

const finishImport = async ({ importId }) => updateOne({
  filter: { importId },
  update: { finishedAt: new Date(), status: IMPORT_STATUS.FINISHED },
});

const findOneActive = async ({ user }) => {
  const { result, error } = await findOne({
    filter: { user, status: IMPORT_STATUS.ACTIVE },
  });
  if (!result || error) return;
  return result;
};

const updateUserProcessed = async ({ importId }) => updateOne({
  filter: { importId },
  update: { $inc: { usersProcessed: 1 } },
});

module.exports = {
  create,
  updateOne,
  findOne,
  updateMany,
  find,
  findOneAndUpdate,
  getUserImport,
  getPendingImport,
  finishImport,
  findOneActive,
  updateUserProcessed,
};
