const _ = require('lodash');
const {
  DescriptionObjectModel, DescriptionStatusModel,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { redisGetter } = require('../../redis');
const rewriteDescription = require('./rewriteDescription');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await DescriptionStatusModel.find({
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

const getObjectDetails = async ({
  user, importId, skip, limit,
}) => {
  const { result, error } = await DescriptionObjectModel.find({
    filter: {
      user,
      importId,
    },
    options: {
      sort: { claim: -1 },
      skip,
      limit: limit + 1,
    },
  });
  if (error) return { error };

  return {
    result: _.take(result, limit),
    hasMore: result.length > limit,
  };
};

const updateImport = async ({
  user, status, importId,
}) => {
  const recovering = await redisGetter.get({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });

  if (recovering && status === IMPORT_STATUS.ACTIVE) {
    status = IMPORT_STATUS.WAITING_RECOVER;
  }

  const { result, error } = await DescriptionStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };

  if (status === IMPORT_STATUS.ACTIVE) {
    rewriteDescription({ user, importId });
  }

  return {
    result,
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await DescriptionStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });

  if (error) return { error };
  await DescriptionObjectModel.deleteMany({
    filter: { user, importId, claim: false },
  });

  return { result };
};

module.exports = {
  getStatistic,
  getObjectDetails,
  updateImport,
  deleteImport,
};
