const _ = require('lodash');
const {
  AuthorityStatusModel, AuthorityObjectModel, ImportStatusModel, DatafinityObject,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { redisGetter } = require('../../redis');
const claimProcess = require('./claimProcess');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await AuthorityStatusModel.find({
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
      sort: history ? { createdAt: -1 } : { finishedAt: -1 },
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
  const { result, error } = await AuthorityObjectModel.find({
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

  const { result, error } = await AuthorityStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };

  if (status === IMPORT_STATUS.ACTIVE) {
    claimProcess({ user, importId });
  }

  return {
    result,
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await AuthorityStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });

  if (error) return { error };
  await AuthorityObjectModel.deleteMany({
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
