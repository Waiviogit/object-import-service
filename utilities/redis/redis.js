const redis = require('redis');
const bluebird = require('bluebird');
const config = require('../../config');
const { expireHelper } = require('./subscriber/subHelper');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const importWobjectsDataClient = redis.createClient(process.env.REDISCLOUD_URL);
const importWobjectsQueueClient = redis.createClient(process.env.REDISCLOUD_URL);
const lastBlockCLient = redis.createClient(process.env.REDISCLOUD_URL);
const botsData = redis.createClient(process.env.REDISCLOUD_URL);

importWobjectsDataClient.select(config.redis.importWobjData);
importWobjectsQueueClient.select(config.redis.importQueue);
lastBlockCLient.select(config.redis.lastBlock);
botsData.select(config.redis.botsData);

const objectPublisher = redis.createClient({ db: config.redis.importWobjData });

const subscribeObjectsExpired = (onMessageCallBack) => {
  const subscribeExpired = () => {
    const subscriber = redis.createClient({ db: config.redis.importWobjData });
    const expiredSubKey = `__keyevent@${config.redis.importWobjData}__:expired`;

    expireHelper(subscriber, expiredSubKey, onMessageCallBack);
  };
  objectPublisher.send_command('config', ['Ex'], subscribeExpired);
};

module.exports = {
  importWobjectsDataClient, importWobjectsQueueClient, lastBlockCLient, botsData, subscribeObjectsExpired,
};
