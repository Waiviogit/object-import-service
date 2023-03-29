const { importWobjectsDataClient } = require('./redis');
const { importRsmqClient } = require('./rsmq');

const getHashAll = async function (key, client = importWobjectsDataClient) {
  const res = await client.hgetallAsync(key);

  return res;
};

const get = async ({ key, client = importWobjectsDataClient }) => client
  .getAsync(key);

const getQueueLength = async (qname = 'import_wobjects', client = importRsmqClient) => {
  try {
    const attributes = await client.getQueueAttributesAsync({ qname });
    return { result: attributes.msgs };
  } catch (e) {
    return { error: e };
  }
};

module.exports = { getHashAll, get, getQueueLength };
