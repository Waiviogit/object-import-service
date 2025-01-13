const { importWobjectsDataClient, botsData } = require('./redis');
const { importRsmqClient } = require('./rsmq');

const getHashAll = async function (key, client = importWobjectsDataClient) {
  const res = await client.hgetallAsync(key);

  return res;
};

const get = async ({ key, client = importWobjectsDataClient }) => client
  .getAsync(key);
const ttl = async ({ key, client = importWobjectsDataClient }) => client.ttlAsync(key);

const getQueueLength = async (qname = 'import_wobjects', client = importRsmqClient) => {
  try {
    const attributes = await client.getQueueAttributesAsync({ qname });
    return { result: attributes.msgs };
  } catch (e) {
    return { error: e };
  }
};

const sismember = async ({
  key, member, client = botsData,
}) => {
  try {
    const result = await client.sismemberAsync(key, member);
    return !!result;
  } catch (error) {
    return false;
  }
};

module.exports = {
  getHashAll, get, getQueueLength, ttl, sismember,
};
