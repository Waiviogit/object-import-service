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

const END_OF_LIST = 'END_OF_LIST';

const runShopifyObjectsImport = async ({ userName, waivioHostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, waivioHostName });
  if (!shop) return;
  const {
    nextPageParam, status, authority, locale, hostName,
  } = shop;
  if (status !== SYNC_STATUS.ACTIVE) return;
  if (nextPageParam === END_OF_LIST) {
    await ShopifySyncModel.updateStatus({
      userName,
      waivioHostName,
      status: SYNC_STATUS.PENDING,
    });
    await ShopifySyncModel.updateNextPageParam({ userName, waivioHostName, nextPageParam: '' });
    return;
  }

  const { result: client, error: clientError } = await getDecryptedClient({ userName, waivioHostName });
  if (clientError) {
    await ShopifySyncModel.updateStatus({
      userName,
      waivioHostName,
      status: SYNC_STATUS.ON_HOLD,
    });
    return;
  }
  const { result: products, pageInfo, error: fetchProductError } = await getShopifyProducts({
    client, nextPageParam, limit: 1,
  });

  const { result: shopSettings, error: settingsError } = await getShopifyShopSettings({ client });

  if (fetchProductError || settingsError) {
    await ShopifySyncModel.updateStatus({
      userName,
      waivioHostName,
      status: SYNC_STATUS.ON_HOLD,
    });
    return;
  }

  if (!products.length) {
    await ShopifySyncModel.updateStatus({
      userName,
      waivioHostName,
      status: SYNC_STATUS.PENDING,
    });
    await ShopifySyncModel.updateNextPageParam({ userName, waivioHostName, nextPageParam: '' });
    return;
  }

  const mappedProducts = mapShopifyProducts({
    objects: products,
    host: hostName,
    currency: shopSettings.currency,
  });

  const newPageParam = pageInfo?.nextPage?.query?.page_info || END_OF_LIST;
  await ShopifySyncModel.updateNextPageParam({ userName, waivioHostName, nextPageParam: newPageParam });
  // run new objects import

  await importObjects({
    user: userName,
    authority,
    locale,
    objects: mappedProducts,
    onStop: JSON.stringify({
      method: HOOK_ACTION.SHOPIFY_SYNC,
      args: [{ userName, waivioHostName }],
    }),
    onFinish: JSON.stringify({
      method: HOOK_ACTION.SHOPIFY_SYNC,
      args: [{ userName, waivioHostName }],
    }),
  });
};

const startSyncTask = async ({
  userName, waivioHostName, authority, locale,
}) => {
  const { result: validAcc, error: accError } = await importAccountValidator(
    userName,
    VOTE_COST.INITIAL,
  );
  if (accError) return { error: accError };

  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, waivioHostName });
  if (shop.status !== SYNC_STATUS.PENDING) return { error: NotAcceptableError('Sync task already in progress') };

  const { result, error: clientError } = await getDecryptedClient({ userName, waivioHostName });
  if (clientError) return { error: clientError };
  await ShopifySyncModel.updateBeforeImport({
    userName, waivioHostName, authority, locale,
  });
  await runShopifyObjectsImport({ userName, waivioHostName });
  return { result: shop };
};

const stopSyncTask = async ({ userName, waivioHostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, waivioHostName });
  if (!shop) return { error: new NotFoundError() };

  const result = await ShopifySyncModel.stopSyncTask({ userName, waivioHostName });
  return { result };
};

const resumeSyncTask = async ({ userName, waivioHostName }) => {
  const shop = await ShopifySyncModel.findOneByUserNameHost({ userName, waivioHostName });
  if (!shop) return { error: new NotFoundError() };

  if (shop.status !== SYNC_STATUS.ON_HOLD) return { error: NotAcceptableError('Nothing to resume') };

  await ShopifySyncModel.updateBeforeImport({
    userName, waivioHostName, authority: shop.authority, locale: shop.locale,
  });
  await runShopifyObjectsImport({ userName, waivioHostName });
  const updatedShop = await ShopifySyncModel.findOneByUserNameHost({ userName, waivioHostName });

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
