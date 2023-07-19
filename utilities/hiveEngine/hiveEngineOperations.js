const _ = require('lodash');
const { redisGetter } = require('../redis');
const { lastBlockCLient } = require('../redis/redis');
const commentContract = require('../hiveEngineApi/commentsContract');
const marketPools = require('../hiveEngineApi/marketPoolsContract');
const tokensContract = require('../hiveEngineApi/tokensContract');
const { HIVE_ENGINE_NODES, VOTE_EVALUATION } = require('../../constants/requestsConstants');
const { getVotingPower } = require('../hiveEngineApi/commentsContract');

exports.calculateHiveEngineVote = async ({
  symbol, account, poolId, weight, dieselPoolId,
}) => {
  const smtPool = await redisGetter
    .getHashAll(`smt_pool:${symbol}`, lastBlockCLient);
  const rewards = parseFloat(smtPool?.rewardPool) / parseFloat(smtPool?.pendingClaims);
  const votingPowers = await commentContract.getVotingPower({ rewardPoolId: poolId, account });
  const requests = await Promise.all([
    marketPools.getMarketPools({ query: { _id: dieselPoolId } }),
    tokensContract.getTokenBalances({ query: { symbol, account }, hostUrl: HIVE_ENGINE_NODES[1] }),
    redisGetter.getHashAll('current_price_info', lastBlockCLient),
  ]);

  for (const req of requests) {
    if (_.has(req, 'error') || _.isEmpty(req)) {
      return {
        engineVotePrice: 0, rshares: 0, rewards, error: req?.error ?? {},
      };
    }
  }
  const [dieselPools, balances, hiveCurrency] = requests;
  const { stake, delegationsIn } = balances[0];
  const { votingPower } = this.calculateMana(
    votingPowers[0] || {
      votingPower: VOTE_EVALUATION.WEIGHT,
      downvotingPower: VOTE_EVALUATION.WEIGHT,
      lastVoteTimestamp: Date.now(),
    },
  );
  const { quotePrice } = dieselPools[0];

  const finalRshares = parseFloat(stake) + parseFloat(delegationsIn);
  const power = (votingPower * weight) / VOTE_EVALUATION.WEIGHT;

  const rshares = (power * finalRshares) / VOTE_EVALUATION.WEIGHT;
  // we calculate price in hbd cent for usd multiply quotePrice hiveCurrency.usdCurrency
  const price = parseFloat(quotePrice) * parseFloat(hiveCurrency.price);

  const engineVotePrice = rshares * price * rewards;

  return { engineVotePrice, rshares, rewards };
};

exports.calculateMana = (votingPower) => {
  const timestamp = new Date().getTime();
  const result = {
    votingPower: votingPower.votingPower,
    downvotingPower: votingPower.downvotingPower,
    lastVoteTimestamp: votingPower.lastVoteTimestamp,
  };

  result.votingPower += ((timestamp - result.lastVoteTimestamp) * VOTE_EVALUATION.WEIGHT)
        / (VOTE_EVALUATION.REGENERATION_DAYS * 24 * 3600 * 1000);
  result.votingPower = Math.floor(result.votingPower);
  result.votingPower = Math.min(result.votingPower, VOTE_EVALUATION.WEIGHT);

  result.downvotingPower += ((timestamp - result.lastVoteTimestamp) * VOTE_EVALUATION.WEIGHT)
        / (VOTE_EVALUATION.REGENERATION_DAYS * 24 * 3600 * 1000);
  result.downvotingPower = Math.floor(result.downvotingPower);
  result.downvotingPower = Math.min(result.downvotingPower, VOTE_EVALUATION.WEIGHT);

  return result;
};

exports.getVotingPowers = async ({ account }) => {
  const powers = await getVotingPower({
    account,
    rewardPoolId: VOTE_EVALUATION.POOL_ID,
    method: 'findOne',
  });
  return this.calculateMana(powers);
};
