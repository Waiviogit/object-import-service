require('@shopify/shopify-api/adapters/node');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');

const createClient = ({
  accessToken, apiKey, apiSecretKey, hostName,
}) => {
  try {
    const shopify = shopifyApi({
      apiKey,
      apiSecretKey,
      scopes: ['read_products'],
      hostName,
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: false,
    });

    const session = shopify.session.customAppSession(shopify.config.hostName);
    session.accessToken = accessToken;

    return {
      result: new shopify.clients.Rest({ session }),
    };
  } catch (error) {
    return { error };
  }
};

const getShopifyProducts = async ({ client, limit = 10, nextPageParam }) => {
  try {
    const response = await client.get({
      path: 'products',
      query: {
        limit, // Number of products per page
        ...(nextPageParam && { page_info: nextPageParam }),
      },
    });

    return { result: response.body.products, pageInfo: response.pageInfo };
  } catch (error) {
    return { error };
  }
};

const getShopifyShopSettings = async ({ client }) => {
  try {
    const shopData = await client.get({
      path: 'shop',
    });

    return { result: shopData.body.shop };
  } catch (error) {
    return { error };
  }
};

const validateCredentials = async ({ client }) => {
  try {
    const response = await client.get({
      path: 'shop',
    });
    return {
      isValid: true,
      shopName: response.body.shop.name,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};

module.exports = {
  createClient,
  getShopifyProducts,
  getShopifyShopSettings,
  validateCredentials,
};
