const { importWobjectsDataClient } = require('./redis');

const getHashAll = async function (key, client = importWobjectsDataClient) {
  const res = await client.hgetallAsync(key);

  return res;
};

module.exports = { getHashAll };
