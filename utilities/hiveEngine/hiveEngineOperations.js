const _ = require('lodash');
const { redisGetter } = require('../redis');
const { lastBlockCLient } = require('../redis/redis');
const commentContract = require('../hiveEngineApi/commentsContract');
const marketPools = require('../hiveEngineApi/marketPoolsContract');
const tokensContract = require('../hiveEngineApi/tokensContract');
const { VOTE_EVALUATION } = require('../../constants/requestsConstants');
const { getVotingPower } = require('../hiveEngineApi/commentsContract');

exports.calculateHiveEngineVote = async ({
  symbol, account, poolId, weight, dieselPoolId,
}) => {
  const smtPool = await redisGetter
    .getHashAll(`smt_pool:${symbol}`, lastBlockCLient);
  const rewards = parseFloat(smtPool?.rewardPool) / parseFloat(smtPool?.pendingClaims);

  const requests = await Promise.all([
    marketPools.getMarketPools({ query: { _id: dieselPoolId } }),
    tokensContract.getTokenBalances({ query: { symbol, account } }),
    redisGetter.getHashAll('current_price_info', lastBlockCLient),
    commentContract.getVotingPower({ rewardPoolId: poolId, account }),
  ]);

  for (const [index, req] of requests.entries()) {
    if (_.has(req, 'error') || _.isEmpty(req)) {
      const errorMessages = {
        0: 'No info About SMT pool',
        1: 'No info about user WAIV balance',
        2: 'No info about current price',
        3: 'No info about user voting power',
      };
      const message = errorMessages[index];

      return {
        engineVotePrice: 0, rshares: 0, rewards, error: req?.error ?? { message },
      };
    }
  }
  const [dieselPools, balances, hiveCurrency, votingPowers] = requests;
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
  return this.calculateMana(powers || {
    votingPower: VOTE_EVALUATION.WEIGHT,
    downvotingPower: VOTE_EVALUATION.WEIGHT,
    lastVoteTimestamp: Date.now(),
  });
};
