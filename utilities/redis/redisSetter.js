const { importWobjectsDataClient, botsData } = require('./redis');

const setImportWobjData = async (key, data) => {
  if (key && data) {
    for (const field in data) {
      await importWobjectsDataClient.hsetAsync(key, field, data[field]);
    }
  }
};

const delImportWobjData = async (key) => {
  if (key) {
    await importWobjectsDataClient.del(key);
  }
};

const sadd = async ({ key, data, client = botsData }) => client.saddAsync(key, ...data);

const set = async ({ key, value, client = importWobjectsDataClient }) => client
  .setAsync(key, value);

const incr = async ({ key, client = importWobjectsDataClient }) => client
  .incrAsync(key);

const expire = async ({ key, ttl, client = importWobjectsDataClient }) => client
  .expireAsync(key, ttl);

module.exports = {
  setImportWobjData,
  delImportWobjData,
  sadd,
  set,
  expire,
  incr,
};
