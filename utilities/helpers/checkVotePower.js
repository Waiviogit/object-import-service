const BigNumber = require('bignumber.js');
const engineOperations = require('../hiveEngine/hiveEngineOperations');
const { VOTE_EVALUATION } = require('../../constants/requestsConstants');
const { WHITE_LIST, VOTE_COST } = require('../../constants/voteAbility');
const { redisGetter } = require('../redis');
const { lastBlockCLient } = require('../redis/redis');
const { getMarketPools } = require('../hiveEngineApi/marketPoolsContract');

exports.checkVotePower = async (user, voteCost) => {
  const { engineVotePrice } = await engineOperations.calculateHiveEngineVote({
    symbol: VOTE_EVALUATION.TOKEN_SYMBOL,
    account: user,
    poolId: VOTE_EVALUATION.POOL_ID,
    dieselPoolId: VOTE_EVALUATION.DIESEL_POOL_ID,
    weight: VOTE_EVALUATION.WEIGHT,
  });

  return WHITE_LIST.includes(user) ? !new BigNumber(engineVotePrice).lt(VOTE_COST.FOR_WHITE_LIST)
    : !new BigNumber(engineVotePrice).lt(voteCost);
};

exports.getMinAmountInWaiv = async (account) => {
  const numerator = WHITE_LIST.includes(account) ? VOTE_COST.FOR_WHITE_LIST : VOTE_COST.USUAL;
  const hiveCurrency = await redisGetter.getHashAll('current_price_info', lastBlockCLient);
  const pool = await getMarketPools({ query: { _id: VOTE_EVALUATION.DIESEL_POOL_ID }, method: 'findOne' });
  return numerator / (hiveCurrency.price * pool.quotePrice);
};
