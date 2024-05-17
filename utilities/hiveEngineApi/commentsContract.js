const _ = require('lodash');
const { engineProxy } = require('./hiveEngineApi');

exports.getVotingPower = async ({ rewardPoolId, account, method }) => {
  const result = await engineProxy({
    endpoint: '/contracts',
    params: {
      contract: 'comments',
      table: 'votingPower',
      query: { rewardPoolId, account },
    },
    method,
  });

  const onEmptyResp = {
    votingPower: 10000,
    downvotingPower: 10000,
    lastVoteTimestamp: Date.now(),
  };
  if (_.isEmpty(result)) return [onEmptyResp];
  return result;
};
