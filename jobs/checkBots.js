const { CronJob } = require('cron');
const _ = require('lodash');
const { getAccountRC } = require('../utilities/hiveApi/userUtil');
const { ImportStatusModel } = require('../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../constants/appData');
const { startObjectImport } = require('../utilities/services/importDatafinityObjects');
const { redisSetter } = require('../utilities/redis');

const stopImports = async () => {
  const { result } = await ImportStatusModel.findOne({
    filter: { status: IMPORT_STATUS.ACTIVE },
  });
  if (!result) return;
  await ImportStatusModel.updateMany({
    filter: { status: IMPORT_STATUS.ACTIVE },
    update: { $set: { status: IMPORT_STATUS.WAITING_RECOVER } },
  });
  await redisSetter
    .set({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER, value: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });
};

const startImports = async () => {
  const { result } = await ImportStatusModel.findOne({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
  });
  if (!result) return;

  const { result: stoppedImports } = await ImportStatusModel.find({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
  });
  if (_.isEmpty(stoppedImports)) return;

  await ImportStatusModel.updateMany({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
    update: { $set: { status: IMPORT_STATUS.ACTIVE } },
  });
  await redisSetter.delImportWobjData(IMPORT_REDIS_KEYS.STOP_FOR_RECOVER);

  for (const resultElement of stoppedImports) {
    const { user, importId } = resultElement;
    await startObjectImport({ user, importId });
  }
};

const checkBots = new CronJob('0 */10 * * * *', async () => {
  await redisSetter.delImportWobjData(IMPORT_REDIS_KEYS.STOP_FOR_RECOVER);

  const rc = await getAccountRC('waivio.updates01');

  const { percentage = 0 } = rc;
  if (percentage < 8000) {
    await stopImports();
  }

  if (percentage > 8200) {
    await startImports();
  }
}, null, false, null, null, true);

module.exports = checkBots;
