const { importAccountValidator } = require('../../../validators/accountValidator');
const { VOTE_COST } = require('../../../constants/voteAbility');
const { getDecryptedClient } = require('./shopifyEncryption');
const { getShopifyProducts, getShopifyShopSettings } = require('./shopifyApi');
const { ShopifySyncModel } = require('../../../models');
const { NotAcceptableError, NotFoundError } = require('../../../constants/httpErrors');
const mapShopifyProducts = require('./mapShopifyProducts');
const { HOOK_ACTION } = require('../../../constants/appData');
const { importObjects } = require('../objectsImport/createHandler');

const SYNC_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  ON_HOLD: 'onHold',
};

const runShopifyObjectsImport = async ({ userName, hostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, hostName });
  if (!shop) return;
  const {
    sinceId, status, authority, locale,
  } = shop;
  if (status !== SYNC_STATUS.ACTIVE) return;
  const { result: client, error: clientError } = await getDecryptedClient({ userName, hostName });
  if (clientError) {
    await ShopifySyncModel.updateStatus({
      userName,
      hostName,
      status: SYNC_STATUS.ON_HOLD,
    });
    return;
  }
  const { result: products, error: fetchProductError } = await getShopifyProducts({
    client, sinceId,
  });

  const { result: shopSettings, error: settingsError } = await getShopifyShopSettings({ client });
  if (fetchProductError || settingsError) {
    await ShopifySyncModel.updateStatus({
      userName,
      hostName,
      status: SYNC_STATUS.ON_HOLD,
    });
    return;
  }

  if (!products.length) {
    await ShopifySyncModel.updateStatus({
      userName,
      hostName,
      status: SYNC_STATUS.PENDING,
    });
    return;
  }

  const lastId = products.at(-1).id;

  const mappedProducts = mapShopifyProducts({
    objects: products,
    host: hostName,
    currency: shopSettings.currency,
  });
  await ShopifySyncModel.updateSinceId({ userName, hostName, sinceId: lastId });
  // run new objects import

  await importObjects({
    user: userName,
    authority,
    locale,
    objects: mappedProducts,
    onStop: JSON.stringify({
      method: HOOK_ACTION.SHOPIFY_SYNC,
      args: [{ userName, hostName }],
    }),
    onFinish: JSON.stringify({
      method: HOOK_ACTION.SHOPIFY_SYNC,
      args: [{ userName, hostName }],
    }),
  });
};

const startSyncTask = async ({
  userName, hostName, authority, locale,
}) => {
  const { result: validAcc, error: accError } = await importAccountValidator(
    userName,
    VOTE_COST.INITIAL,
  );
  if (accError) return { error: accError };

  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, hostName });
  if (shop.status !== SYNC_STATUS.PENDING) return { error: NotAcceptableError('Sync task already in progress') };

  const { result, error: clientError } = await getDecryptedClient({ userName, hostName });
  if (clientError) return { error: clientError };
  await ShopifySyncModel.updateBeforeImport({
    userName, hostName, authority, locale,
  });
  await runShopifyObjectsImport({ userName, hostName });
  return { result: shop };
};

const stopSyncTask = async ({ userName, hostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, hostName });
  if (!shop) return { error: new NotFoundError() };

  const result = await ShopifySyncModel.stopSyncTask({ userName, hostName });
  return { result };
};

const resumeSyncTask = async ({ userName, hostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, hostName });
  if (!shop) return { error: new NotFoundError() };

  if (shop.status !== SYNC_STATUS.ON_HOLD) return { error: NotAcceptableError('Nothing to resume') };

  await ShopifySyncModel.updateBeforeImport({
    userName, hostName, authority: shop.authority, locale: shop.locale,
  });
  await runShopifyObjectsImport({ userName, hostName });
  const updatedShop = await ShopifySyncModel.findOneByUserNameHost({ userName, hostName });

  return {
    result: updatedShop,
  };
};

const getAppsList = async ({ userName }) => {
  const result = await ShopifySyncModel.findByUserName({ userName });
  return { result };
};

module.exports = {
  startSyncTask,
  runShopifyObjectsImport,
  stopSyncTask,
  getAppsList,
  resumeSyncTask,
};
