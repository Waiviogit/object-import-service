const validators = require('./validators');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { getAccessTokensFromReq } = require('../utilities/helpers/reqHelper');
const createThreadTask = require('../utilities/services/groupMessageThread/createThreadTask');
const { redisSetter, redisGetter } = require('../utilities/redis');
const { IMPORT_REDIS_KEYS, MIN_RC_POSTING_DEFAULT } = require('../constants/appData');
const threadsManage = require('../utilities/services/groupMessageThread/threadsManage');

const createTask = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.threadValidator.threadTaskSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  const { result, error } = await createThreadTask(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const setRC = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.threadValidator.minRcSchema,
    next,
  );

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  if (!value) return;
  await redisSetter.set({
    key: `${IMPORT_REDIS_KEYS.MIN_RC_THREADS}:${value.user}`,
    value: value.minRc,
  });

  return res.status(200).json(value);
};

const getRC = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.getPowerSchema,
    next,
  );
  if (!value) return;
  const key = `${IMPORT_REDIS_KEYS.MIN_RC_THREADS}:${value.user}`;
  const power = await redisGetter.get({ key });
  if (power) return res.status(200).json({ minRc: Number(power), user: value.user });

  await redisSetter.set({ key, value: MIN_RC_POSTING_DEFAULT });
  return res.status(200).json({ minRc: MIN_RC_POSTING_DEFAULT, user: value.user });
};

const getImportHistory = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await threadsManage.getStatistic({ ...value, history: true });

  if (error) return next(error);
  return res.status(200).json(result);
};

const getImportStatistic = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await threadsManage.getStatistic(value);

  if (error) return next(error);
  return res.status(200).json(result);
};

const changeImportDetails = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.importStatusSchema,
    next,
  );

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  if (!value) return;
  const { result, error } = await threadsManage
    .updateImport(value);

  if (error) return next(error);
  return res.status(200).json(result);
};

const deleteImport = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.deleteImportSchema,
    next,
  );

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  if (!value) return;
  const { result, error } = await threadsManage.deleteImport(value);

  if (error) return next(error);
  return res.status(200).json(result);
};

module.exports = {
  createTask,
  getRC,
  setRC,
  getImportHistory,
  getImportStatistic,
  deleteImport,
  changeImportDetails,
};
