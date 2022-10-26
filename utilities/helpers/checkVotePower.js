const BigNumber = require('bignumber.js');
const engineOperations = require('../hiveEngine/hiveEngineOperations');
const { VOTE_EVALUATION } = require('../../constants/requestsConstants');
const { WHITE_LIST, VOTE_COST } = require('../../constants/voteAbility');

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
