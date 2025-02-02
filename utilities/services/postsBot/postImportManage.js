const { PostStatusModel, PostImportModel } = require('../../../models');
const { IMPORT_STATUS } = require('../../../constants/appData');

const postImport = require('./postImport');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await PostStatusModel.find({
    filter: {
      user,
      status: {
        $in: history
          ? [IMPORT_STATUS.FINISHED, IMPORT_STATUS.DELETED]
          : [
            IMPORT_STATUS.ACTIVE,
            IMPORT_STATUS.WAITING_RECOVER,
            IMPORT_STATUS.PENDING,
            IMPORT_STATUS.ON_HOLD,
          ],
      },
    },
    projection: {
      pageContent: 0,
    },
    options: {
      sort: history ? { finishedAt: -1 } : { createdAt: -1 },
      skip,
      limit,
    },
  });
  if (error) return { error };

  return {
    result,
  };
};

const updateImport = async ({
  user, status, importId,
}) => {
  const { result, error } = await PostStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };

  if (status === IMPORT_STATUS.ACTIVE) {
    const active = await PostStatusModel.findOneActive({ user });
    if (active) postImport({ user, importId });
  }

  return {
    result,
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await PostStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });

  if (error) return { error };
  await PostImportModel.deleteMany({
    filter: { user, importId },
  });

  return { result };
};

module.exports = {
  getStatistic,
  updateImport,
  deleteImport,
};
