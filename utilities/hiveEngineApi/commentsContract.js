const { engineProxy } = require('./hiveEngineApi');

exports.getVotingPower = async ({ rewardPoolId, account, method }) => engineProxy({
  endpoint: '/contracts',
  params: {
    contract: 'comments',
    table: 'votingPower',
    query: { rewardPoolId, account },
  },
  method,
});
