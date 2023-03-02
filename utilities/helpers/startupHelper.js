const { redisSetter } = require('../redis');
const { WHITE_LIST_KEY, WHITE_LIST } = require('../../constants/voteAbility');
const { importObjectsService } = require('../services');
const { subscribeObjectsExpired } = require('../redis/redis');
const { subscribeVoteRenew } = require('../redis/subscriber/subscriber');
const startupImportHelper = require('./startupImportHelper');

const addWhiteListToRedis = async () => redisSetter.sadd({
  key: WHITE_LIST_KEY,
  data: WHITE_LIST,
});

exports.init = async () => {
  await addWhiteListToRedis();
  subscribeObjectsExpired(subscribeVoteRenew);
  importObjectsService.runImportWobjectsQueue();
  startupImportHelper();
};
