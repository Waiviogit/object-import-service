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

const getShopifyProducts = async ({ client, limit = 10, sinceId }) => {
  try {
    const response = await client.get({
      path: 'products',
      query: {
        limit, // Number of products per page
        ...(sinceId && { since_id: sinceId }), // Skip products before this ID
      },
    });
    console.log(JSON.stringify(response.body.products, null, 2));

    return { result: response.body.products };
  } catch (error) {
    return { error };
  }
};

const getShopifyShopSettings = async ({ client }) => {
  try {
    const shopData = await client.get({
      path: 'shop',
    });
    console.log(JSON.stringify(shopData.body, null, 2));

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
