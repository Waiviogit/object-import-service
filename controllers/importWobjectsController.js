const validators = require('./validators');
const {
  importObjectsService, importTagsService, importObjectsFromFile, importDatafinityObjects, importManage,
} = require('../utilities/services');
const { validateImmediatelyImport } = require('../utilities/objectBotApi/validators');
const { FILE_MAX_SIZE } = require('../constants/fileFormats');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { importAccountValidator } = require('../validators/accountValidator');
const { redisSetter, redisGetter } = require('../utilities/redis');
const { IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT } = require('../constants/appData');
const { getVoteCostInitial } = require('../utilities/helpers/importDatafinityHelper');
const { parseAsinsByUri, getNotPublishedAsins } = require('../utilities/services/parseAsinsByUri');

const importWobjects = async (req, res, next) => {
  const data = {
    wobjects: req.body.wobjects || [],
    immediately: req.body.immediately || false,
  };
  const validateImmediately = validateImmediatelyImport(req);

  if (!validateImmediately) {
    return next({ status: 422, message: 'Not enough data in immediately request!' });
  }
  await importObjectsService.addWobjectsToQueue(data);
  console.log('wobjects added to queue');
  res.status(200).json({ message: 'Wobjects added to queue of creating!' });
}; // add wobjects to queue for send it to objects-bot and write it to blockchain

const importTags = async (req, res, next) => {
  const tags = req.body.tags || [];

  await importTagsService.importTags({ tags });
  res.status(200).json({ message: 'Wobjects by tags added to queue of creating' });
};

const importWobjectsJson = async (req, res, next) => {
  const { result, error } = await importObjectsFromFile.importWobjects();

  if (error) {
    return next(error);
  }
  res.status(200).json({ message: 'Wobjects added to queue of creating!' });
};

const importObjectsFromTextOrJson = async (req, res, next) => {
  if (!req.file) {
    return next({ error: { status: 422, message: 'No File' } });
  }
  if (req.file.size > FILE_MAX_SIZE) {
    return next({ error: { status: 422, message: 'Allowed file size must be less than 100 MB' } });
  }
  const value = validators.validate(
    req.body,
    validators.importWobjects.importDatafinityObjectsSchema,
    next,
  );

  if (!value) return;

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);

  if (authError) return next(authError);

  const { result: validAcc, error: accError } = await importAccountValidator(
    value.user,
    getVoteCostInitial(value.user),
  );
  if (!validAcc) return next(accError);

  const { result, error } = await importDatafinityObjects
    .importObjects({ file: req.file, ...value });
  if (error) return next(error);

  res.status(200).json({ result });
};

const getImportStatistic = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await importManage.getStatistic(value);
  if (error) return next(error);
  res.status(200).json(result);
};

const getImportHistory = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await importManage.getStatistic({ ...value, history: true });
  if (error) return next(error);
  res.status(200).json(result);
};

const changeImportDetails = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.importStatusSchema,
    next,
  );

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);
  if (authError) return next(authError);

  if (!value) return;
  const { result, error } = await importManage.updateImport(value);
  if (error) return next(error);
  res.status(200).json(result);
};

const deleteImport = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.deleteImportSchema,
    next,
  );

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);
  if (authError) return next(authError);

  if (!value) return;
  const { result, error } = await importManage.deleteImport(value);
  if (error) return next(error);
  res.status(200).json(result);
};

const setVotingPower = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.minVotingPowerSchema,
    next,
  );

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);
  if (authError) return next(authError);

  if (!value) return;
  await redisSetter.set({
    key: `${IMPORT_REDIS_KEYS.MIN_POWER}:${value.user}`,
    value: value.minVotingPower,
  });

  res.status(200).json(value);
};

const getVotingPower = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.getPowerSchema,
    next,
  );
  if (!value) return;

  const key = `${IMPORT_REDIS_KEYS.MIN_POWER}:${value.user}`;
  const power = await redisGetter.get({ key });
  if (power) {
    return res.status(200).json({ minVotingPower: Number(power), user: value.user });
  }
  await redisSetter.set({ key, value: DEFAULT_VOTE_POWER_IMPORT });

  res.status(200).json({ minVotingPower: DEFAULT_VOTE_POWER_IMPORT, user: value.user });
};

const getAmazonAsins = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.getAsinsSchema,
    next,
  );
  if (!value) return;

  const result = await parseAsinsByUri(value);
  res.status(200).json(result);
};

const getNotPublished = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.getNotPublishedAsinsSchema,
    next,
  );
  if (!value) return;

  const result = await getNotPublishedAsins(value);
  res.status(200).json(result);
};

module.exports = {
  importWobjects,
  importTags,
  importWobjectsJson,
  importObjectsFromTextOrJson,
  getImportStatistic,
  changeImportDetails,
  deleteImport,
  setVotingPower,
  getVotingPower,
  getImportHistory,
  getAmazonAsins,
  getNotPublished,
};
