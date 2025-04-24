const { ShopifyKeys } = require('../../database').models;

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ShopifyKeys.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await ShopifyKeys.findOne(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ShopifyKeys.find(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneByUserNameHost = async ({ userName, hostName }) => {
  const { result } = await findOne({ filter: { userName, hostName } });
  return result;
};

const findByUserNameHost = async ({ userName, hostName }) => {
  const { result } = await find({
    filter: { userName, hostName },
    projection: { userName: 1, hostName: 1 },
  });
  return result;
};

const createShopifyKeys = async ({
  userName, accessToken, apiKey, apiSecretKey, hostName,
}) => updateOne({
  filter: {
    userName, hostName,
  },
  update: {
    accessToken,
    apiKey,
    apiSecretKey,
  },
  options: { upsert: true },
});

module.exports = {
  createShopifyKeys,
  findOneByUserNameHost,
  findByUserNameHost,
};
