const { CronJob } = require('cron');
const _ = require('lodash');
const { getAccountRC } = require('../utilities/hiveApi/userUtil');
const {
  ImportStatusModel,
  AuthorityStatusModel,
  DepartmentsStatusModel,
  DuplicateListStatusModel,
  DescriptionStatusModel,
  ServiceBotModel,
} = require('../models');
const {
  IMPORT_STATUS, IMPORT_REDIS_KEYS, IMPORT_GLOBAL_SETTINGS, OBJECT_BOT_ROLE,
} = require('../constants/appData');
const { startObjectImport } = require('../utilities/services/importDatafinityObjects');
const { redisSetter, redisGetter } = require('../utilities/redis');
const config = require('../config');
const claimProcess = require('../utilities/services/authority/claimProcess');
const importDepartments = require('../utilities/services/departmentsService/importDepartments');
const duplicateProcess = require('../utilities/services/listDuplication/duplicateProcess');
const rewriteDescription = require('../utilities/services/descriptionBot/rewriteDescription');

const processes = [
  {
    model: ImportStatusModel,
    processStarter: startObjectImport,
  },
  {
    model: AuthorityStatusModel,
    processStarter: claimProcess,
  },
  {
    model: DepartmentsStatusModel,
    processStarter: importDepartments,
  },

  {
    model: DuplicateListStatusModel,
    processStarter: duplicateProcess,
  },
  {
    model: DescriptionStatusModel,
    processStarter: rewriteDescription,
  },
];

const stopImports = async () => {
  let activeImport = false;
  for (const process of processes) {
    const { result } = await process.model.findOne({
      filter: { status: IMPORT_STATUS.ACTIVE },
    });
    if (result) {
      activeImport = true;
      break;
    }
  }
  await redisSetter
    .set({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER, value: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });
  if (!activeImport) return;

  for (const process of processes) {
    await process.model.updateMany({
      filter: { status: IMPORT_STATUS.ACTIVE },
      update: { $set: { status: IMPORT_STATUS.WAITING_RECOVER } },
    });
  }
};

const startImports = async () => {
  for (const process of processes) {
    const { result } = await process.model.findOne({
      filter: { status: IMPORT_STATUS.WAITING_RECOVER },
    });
    if (!result) continue;

    const { result: stoppedImports } = await process.model.find({
      filter: { status: IMPORT_STATUS.WAITING_RECOVER },
    });
    if (_.isEmpty(stoppedImports)) continue;

    await process.model.updateMany({
      filter: { status: IMPORT_STATUS.WAITING_RECOVER },
      update: { $set: { status: IMPORT_STATUS.ACTIVE } },
    });

    for (const resultElement of stoppedImports) {
      const { user, importId } = resultElement;
      process.processStarter({ user, importId });
    }
  }
};

const getAverageRc = async () => {
  const bots = await ServiceBotModel.findByRole({ role: OBJECT_BOT_ROLE.SERVICE_BOT });
  if (!bots.length) return 0;

  const botNames = bots.map((el) => el.name);

  const rates = await Promise.all(botNames.map(async (bot) => getAccountRC(bot)));
  const filteredRates = _.filter(rates, (r) => !r.error);
  const sum = _.sumBy(filteredRates, 'percentage');

  return Math.round(sum / filteredRates.length);
};

const checkBots = new CronJob('0 */1 * * * *', async () => {
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
