const { IMPORT_STATUS } = require('../../constants/appData');
const { AuthorityStatus } = require('../../importObjectsDB').models;

const create = async (doc) => {
  try {
    const result = await AuthorityStatus.create(doc);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await AuthorityStatus.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await AuthorityStatus.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await AuthorityStatus.findOneAndUpdate(filter, update, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await AuthorityStatus.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateMany = async ({ filter, update, options }) => {
  try {
    const result = await AuthorityStatus.updateMany(filter, update, options);
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

const finishImport = async ({ user, importId }) => {
  const { result } = await updateOne({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.FINISHED, finishedAt: new Date() },
  });

  return !!result?.nModified;
};

const updateClaimedCount = async ({
  user, importId, objectsClaimed, fieldsVoted,
}) => {
  const { result } = await updateOne({
    filter: { user, importId },
    update: { $inc: { objectsClaimed, fieldsVoted } },
  });

  return !!result?.nModified;
};

module.exports = {
  create,
  findOne,
  getUserImport,
  updateOne,
  finishImport,
  updateClaimedCount,
  find,
  findOneAndUpdate,
  updateMany,
};
