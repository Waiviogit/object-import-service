const { ThreadStatusModel, ThreadMessageModel } = require('../../../models');
const { IMPORT_STATUS } = require('../../../constants/appData');

const threadMessage = require('./threadMessage');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await ThreadStatusModel.find({
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
  const { result, error } = await ThreadStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };

  if (status === IMPORT_STATUS.ACTIVE) {
    const active = await ThreadStatusModel.findOneActive({ user });
    if (!active) threadMessage({ user, importId });
  }

  return {
    result,
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await ThreadStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });

  if (error) return { error };
  await ThreadMessageModel.deleteMany({
    filter: { user, importId, processed: false },
  });

  return { result };
};

module.exports = {
  getStatistic,
  updateImport,
  deleteImport,
};
