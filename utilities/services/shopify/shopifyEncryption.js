const { NotAcceptableError, NotFoundError } = require('../../../constants/httpErrors');
const { createClient, validateCredentials } = require('./shopifyApi');
const { encryptData, decryptKey } = require('../../helpers/encryptionHelper');
const { ShopifyKeysModel, ShopifySyncModel } = require('../../../models');

const createShopifyKeys = async ({
  userName, accessToken, apiKey, apiSecretKey, hostName, waivioHostName,
}) => {
  const { result: client, error: clientError } = await createClient({
    accessToken, apiKey, apiSecretKey, hostName,
  });
  if (clientError) return { error: new NotAcceptableError(clientError.message) };
  const { isValid } = await validateCredentials({ client });
  if (!isValid) return { error: new NotAcceptableError('Invalid credentials') };

  const accessTokenEn = encryptData({ data: accessToken });
  const apiSecretKeyEn = encryptData({ data: apiSecretKey });

  const { result, error } = await ShopifyKeysModel.createShopifyKeys({
    userName, accessToken: accessTokenEn, apiKey, apiSecretKey: apiSecretKeyEn, hostName, waivioHostName,
  });
  if (error) return { error: new NotAcceptableError('Can\'t save keys') };
  // here we need to create additional doc to status sync on host, create only if don't exist
  const syncdoc = await ShopifySyncModel.createSyncDoc({ userName, hostName, waivioHostName });
  return { result: syncdoc };
};

const getShopifyCredentials = async ({ userName, waivioHostName }) => {
  const encryptedObject = await ShopifyKeysModel.findOneByUserNameHost({ userName, waivioHostName });
  if (!encryptedObject) return { error: new NotFoundError() };

  const {
    accessToken, apiKey, apiSecretKey, hostName,
  } = encryptedObject;
  const decryptedObject = {
    accessToken: decryptKey(accessToken),
    apiKey,
    apiSecretKey: decryptKey(apiSecretKey),
    hostName,
    waivioHostName,
  };

  return { result: decryptedObject };
};

const getDecryptedClient = async ({ userName, waivioHostName }) => {
  const encryptedObject = await ShopifyKeysModel.findOneByUserNameHost({ userName, waivioHostName });
  if (!encryptedObject) return { error: new NotFoundError() };

  const {
    accessToken, apiKey, apiSecretKey, hostName,
  } = encryptedObject;
  const decryptedObject = {
    accessToken: decryptKey(accessToken),
    apiKey,
    apiSecretKey: decryptKey(apiSecretKey),
    hostName,
  };

  const { result: client, error: clientError } = await createClient(decryptedObject);
  if (clientError) return { error: clientError };

  return { result: client };
};

const deleteCredentials = async ({
  userName, waivioHostName,
}) => {
  await ShopifyKeysModel.deleteOneByUserNameHost({ userName, waivioHostName });
  await ShopifySyncModel.deleteOneByUserNameHost({ userName, waivioHostName });

  return { result: true };
};

module.exports = {
  createShopifyKeys,
  getDecryptedClient,
  getShopifyCredentials,
  deleteCredentials,
};
