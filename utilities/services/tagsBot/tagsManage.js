const _ = require('lodash');
const {
  Wobj, TagsObjectModel, TagsStatusModel,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { redisGetter } = require('../../redis');
const createTags = require('./createTags');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await TagsStatusModel.find({
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

  await Promise.all(result.map(async (el) => {
    const { result: object } = await Wobj.findOne({
      filter: { author_permlink: el.baseList },
      projection: { author_permlink: 1, object_type: 1, _id: 0 },
    });
    el.object = object;
  }));

  return {
    result,
  };
};

const getObjectDetails = async ({
  user, importId, skip, limit,
}) => {
  const { result, error } = await TagsObjectModel.find({
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

  const { result, error } = await TagsStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };

  if (status === IMPORT_STATUS.ACTIVE) {
    createTags({ user, importId });
  }

  return {
    result,
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await TagsStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });

  if (error) return { error };
  await TagsObjectModel.deleteMany({
    filter: { user, importId },
  });

  return { result };
};

module.exports = {
  getStatistic,
  getObjectDetails,
  updateImport,
  deleteImport,
};
