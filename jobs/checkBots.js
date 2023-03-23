const { CronJob } = require('cron');
const _ = require('lodash');
const { getAccountRC } = require('../utilities/hiveApi/userUtil');
const { ImportStatusModel, AppModel } = require('../models');
const {
  IMPORT_STATUS, IMPORT_REDIS_KEYS, IMPORT_GLOBAL_SETTINGS, OBJECT_BOT_ROLE,
} = require('../constants/appData');
const { startObjectImport } = require('../utilities/services/importDatafinityObjects');
const { redisSetter, redisGetter } = require('../utilities/redis');
const config = require('../config');

const stopImports = async () => {
  const { result } = await ImportStatusModel.findOne({
    filter: { status: IMPORT_STATUS.ACTIVE },
  });
  await redisSetter
    .set({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER, value: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });
  if (!result) return;
  await ImportStatusModel.updateMany({
    filter: { status: IMPORT_STATUS.ACTIVE },
    update: { $set: { status: IMPORT_STATUS.WAITING_RECOVER } },
  });
};

const startImports = async () => {
  const { result } = await ImportStatusModel.findOne({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
  });
  await redisSetter.delImportWobjData(IMPORT_REDIS_KEYS.STOP_FOR_RECOVER);
  if (!result) return;

  const { result: stoppedImports } = await ImportStatusModel.find({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
  });
  if (_.isEmpty(stoppedImports)) return;

  await ImportStatusModel.updateMany({
    filter: { status: IMPORT_STATUS.WAITING_RECOVER },
    update: { $set: { status: IMPORT_STATUS.ACTIVE } },
  });

  for (const resultElement of stoppedImports) {
    const { user, importId } = resultElement;
    await startObjectImport({ user, importId });
  }
};

const getAverageRc = async () => {
  const botNames = await AppModel.getBotsByRoleAndHost(
    { host: config.appHost, role: OBJECT_BOT_ROLE.SERVICE_BOT },
  );
  if (!botNames.length) return 0;
  const rates = await Promise.all(botNames.map(async (bot) => getAccountRC(bot)));
  const filteredRates = _.filter(rates, (r) => !r.error);
  const sum = _.sumBy(filteredRates, 'percentage');

  return Math.round(sum / filteredRates.length);
};

const checkBots = new CronJob('0 */5 * * * *', async () => {
  const rc = await getAverageRc();
  const { result: queueLength = 0 } = await redisGetter.getQueueLength();

  if (rc < IMPORT_GLOBAL_SETTINGS.RC_TO_STOP) {
    await stopImports();
    return;
  }
  if (queueLength > IMPORT_GLOBAL_SETTINGS.OBJECTS_MAX_QUEUE) {
    await stopImports();
    return;
  }

  if (rc > IMPORT_GLOBAL_SETTINGS.RC_TO_RESTORE) {
    await startImports();
  }
}, null, false, null, null, true);

module.exports = checkBots;