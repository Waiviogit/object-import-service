const { redisGetter, redisSetter } = require('../redis');
const { WHITE_LIST_KEY } = require('../../constants/voteAbility');

const checkWhiteList = async (user) => redisGetter.sismember({ key: WHITE_LIST_KEY, member: user });

const addWhiteListToRedis = async (member) => {
  if (!member) return;
  if (typeof member !== 'string') return;
  await redisSetter.sadd({ key: WHITE_LIST_KEY, member });
};

module.exports = { checkWhiteList, addWhiteListToRedis };
