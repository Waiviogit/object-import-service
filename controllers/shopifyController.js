const validators = require('./validators');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { getAccessTokensFromReq } = require('../utilities/helpers/reqHelper');
const { isGuestAccount, checkPostingAuthorities } = require('../validators/accountValidator');
const { NotAcceptableError } = require('../constants/httpErrors');
const {
  startSyncTask, stopSyncTask, getAppsList, resumeSyncTask,
} = require('../utilities/services/shopify/shopifySyncTask');
const { createShopifyKeys, getShopifyCredentials, deleteCredentials } = require('../utilities/services/shopify/shopifyEncryption');

const createTask = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.shopifyValidator.syncTaskSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  if (!isGuestAccount(value.userName)) {
    const validPostingAuthorities = await checkPostingAuthorities(value.userName);
    if (!validPostingAuthorities) return next(new NotAcceptableError('Posting authorities not found'));
  }

  const { result, error } = await startSyncTask(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const addCredentials = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.shopifyValidator.credentialsSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  const { result, error } = await createShopifyKeys(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const getCredentials = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.shopifyValidator.getCredentialsSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  const { result, error } = await getShopifyCredentials(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const deleteCredentialsController = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.shopifyValidator.getCredentialsSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);

  const result = await deleteCredentials(value);
  return res.status(200).json(result);
};

const stopSynchronization = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.shopifyValidator.stopSyncSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);
  const { result, error } = await stopSyncTask(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const resumeSynchronization = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.shopifyValidator.stopSyncSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });
  if (authError) return next(authError);
  const { result, error } = await resumeSyncTask(value);
  if (error) return next(error);
  return res.status(200).json(result);
};

const getApps = async (req, res, next) => {
  const value = validators.validate(
    req.query,
    validators.shopifyValidator.appsListSchema,
    next,
  );
  if (!value) return;

  const { error: authError } = await authorise({
    username: value.userName,
    ...getAccessTokensFromReq(req),
  });

  if (authError) return next(authError);
  const { result } = await getAppsList(value);

  return res.status(200).json(result);
};

module.exports = {
  createTask,
  addCredentials,
  stopSynchronization,
  getApps,
  resumeSynchronization,
  getCredentials,
  deleteCredentialsController,
};
