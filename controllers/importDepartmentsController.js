const validators = require('./validators');
const departmentsService = require('../utilities/services/departmentsService');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { importAccountValidator } = require('../validators/accountValidator');

const { redisSetter, redisGetter } = require('../utilities/redis');
const { IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT } = require('../constants/appData');
const { getAccessTokensFromReq } = require('../utilities/helpers/reqHelper');
const { VOTE_COST } = require('../constants/voteAbility');

const importDepartments = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.departments.departmentsClaimSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  const { result: validAcc, error: accError } = await importAccountValidator(
    value.user,
    VOTE_COST.INITIAL,
  );
  if (!validAcc) return next(accError);

  const { result, error } = await departmentsService.createDepartmentsList(value);
  if (error) return next(error);
  res.status(200).json(result);
};

const setVotingPower = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.importWobjects.minVotingPowerSchema,
    next,
  );

  const { error: authError } = await authorise({
    username: value.user,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  if (!value) return;
  await redisSetter.set({
    key: `${IMPORT_REDIS_KEYS.MIN_POWER_DEPARTMENTS}:${value.user}`,
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

  const key = `${IMPORT_REDIS_KEYS.MIN_POWER_DEPARTMENTS}:${value.user}`;
  const power = await redisGetter.get({ key });
  if (power) {
    return res.status(200).json({ minVotingPower: Number(power), user: value.user });
  }
  await redisSetter.set({ key, value: DEFAULT_VOTE_POWER_IMPORT });

  res.status(200).json({ minVotingPower: DEFAULT_VOTE_POWER_IMPORT, user: value.user });
};

const getImportHistory = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await departmentsService
    .departmentsManage
    .getStatistic({ ...value, history: true });

  if (error) return next(error);
  res.status(200).json(result);
};
const getImportStatistic = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.importWobjects.importStatisticsSchema,
    next,
  );
  if (!value) return;
  const { result, error } = await departmentsService
    .departmentsManage
    .getStatistic(value);

  if (error) return next(error);
  res.status(200).json(result);
};

const getObjectDetails = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.authority.objectDetailsSchema,
    next,
  );
  if (!value) return;
  const { result, hasMore, error } = await departmentsService
    .departmentsManage
    .getObjectDetails(value);

  if (error) return next(error);
  res.status(200).json({ result, hasMore });
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
  const { result, error } = await departmentsService
    .departmentsManage
    .updateImport(value);

  if (error) return next(error);
  res.status(200).json(result);
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
  const { result, error } = await departmentsService
    .departmentsManage
    .deleteImport(value);

  if (error) return next(error);
  res.status(200).json(result);
};

module.exports = {
  importDepartments,
  setVotingPower,
  getVotingPower,
  getImportHistory,
  getImportStatistic,
  getObjectDetails,
  changeImportDetails,
  deleteImport,
};
