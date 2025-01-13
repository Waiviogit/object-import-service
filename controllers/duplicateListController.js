const validators = require('./validators');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { importAccountValidator } = require('../validators/accountValidator');
const { redisSetter, redisGetter } = require('../utilities/redis');
const { IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT } = require('../constants/appData');
const duplicationService = require('../utilities/services/listDuplication');
const { getAccessTokensFromReq } = require('../utilities/helpers/reqHelper');
const { VOTE_COST } = require('../constants/voteAbility');

const duplicateList = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.duplicateList.duplicateListSchema,
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

  const { result, error } = await duplicationService.createDuplicateTask(value);

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
    key: `${IMPORT_REDIS_KEYS.MIN_POWER_DUPLICATE}:${value.user}`,
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

  const key = `${IMPORT_REDIS_KEYS.MIN_POWER_DUPLICATE}:${value.user}`;
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
  const { result, error } = await duplicationService
    .listDuplicationManage
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
  const { result, error } = await duplicationService
    .listDuplicationManage
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
  const { result, hasMore, error } = await duplicationService
    .listDuplicationManage
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
  const { result, error } = await duplicationService
    .listDuplicationManage
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
  const { result, error } = await duplicationService
    .listDuplicationManage
    .deleteImport(value);

  if (error) return next(error);
  res.status(200).json(result);
};

module.exports = {
  duplicateList,
  setVotingPower,
  getVotingPower,
  getImportHistory,
  getImportStatistic,
  getObjectDetails,
  changeImportDetails,
  deleteImport,
};
