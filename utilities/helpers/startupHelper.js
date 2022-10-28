const { redisSetter } = require('../redis');
const { WHITE_LIST_KEY, WHITE_LIST } = require('../../constants/voteAbility');
const { importObjectsService } = require('../services');

const addWhiteListToRedis = async () => redisSetter.sadd({
  key: WHITE_LIST_KEY,
  data: WHITE_LIST,
});

exports.init = async () => {
  await addWhiteListToRedis();
  importObjectsService.runImportWobjectsQueue();
};
