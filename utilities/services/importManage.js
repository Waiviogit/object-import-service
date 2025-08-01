const { ImportStatusModel, DatafinityObject } = require('../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS, HOOK_ACTION } = require('../../constants/appData');
const { startObjectImport } = require('./objectsImport/importDatafinityObjects');
const { redisGetter } = require('../redis');
const { runShopifyObjectsImport } = require('./shopify/shopifySyncTask');
const { parseJson } = require('../helpers/jsonHelper');

const getStatistic = async ({
  user, history = false, skip, limit,
}) => {
  const { result, error } = await ImportStatusModel.find({
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

  for (const resultElement of result) {
    const { result: counter } = await DatafinityObject.distinct({
      field: '_id',
      filter: { importId: resultElement.importId, user },
    });
    resultElement.objectsPosted = resultElement.objectsCount - counter;
    if (!resultElement.objectType) resultElement.objectType = 'product';
  }

  return {
    result,
  };
};

const updateImport = async ({
  user, status, importId,
}) => {
  const pending = await redisGetter.get({ key: `${IMPORT_REDIS_KEYS.PENDING}:${importId}` });
  const recovering = await redisGetter.get({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });

  if (recovering && status === IMPORT_STATUS.ACTIVE) {
    status = IMPORT_STATUS.WAITING_RECOVER;
  }

  if (pending && status === IMPORT_STATUS.ACTIVE) {
    status = IMPORT_STATUS.PENDING;
  }

  const { result, error } = await ImportStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: {
      status,
    },
    options: { new: true },
  });

  if (error) return { error };
  const { result: counter } = await DatafinityObject.distinct({
    field: '_id',
    filter: { importId, user },
  });

  if (status === IMPORT_STATUS.ACTIVE) {
    startObjectImport({ user, importId });
  }

  return {
    result: {
      ...result,
      objectsLastCount: counter,
    },
  };
};

const onStopActions = {
  [HOOK_ACTION.SHOPIFY_SYNC]: runShopifyObjectsImport,
};

const runOnStop = async (onStop) => {
  const parsed = parseJson(onStop, null);
  if (!parsed) return;
  const { method, args } = parsed;
  const handler = onStopActions[method];
  if (!handler) return;
  handler(...args);
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await ImportStatusModel.updateOne({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED, finishedAt: new Date() },
    options: { new: true },
  });
  if (error) return { error };
  const { result: datafinityDelete, error: datafinityDeleteError } = await DatafinityObject
    .deleteMany({
      filter: { user, importId },
    });

  const task = await ImportStatusModel.findOneByImportId(importId);
  if (task.onStop) runOnStop(task.onStop);
  if (datafinityDeleteError) {
    await ImportStatusModel.updateOne({
      filter: { user, importId },
      update: { status: IMPORT_STATUS.ON_HOLD },
    });
    return { error: datafinityDeleteError };
  }
  return { result };
};

module.exports = {
  getStatistic,
  updateImport,
  deleteImport,
};
