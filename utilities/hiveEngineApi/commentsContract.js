const { engineProxy } = require('./hiveEngineApi');

exports.getVotingPower = async (rewardPoolId, account) => engineProxy({
  endpoint: '/contracts',
  params: {
    contract: 'comments',
    table: 'votingPower',
    query: { rewardPoolId, account },
  },
});
