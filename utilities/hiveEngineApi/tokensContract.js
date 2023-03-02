const { engineProxy } = require('./hiveEngineApi');

exports.getTokenBalances = async ({ query, hostUrl, method }) => engineProxy({
  params: {
    contract: 'tokens',
    table: 'balances',
    query,
  },
  method,
  hostUrl,
});

exports.getRewardPool = async ({ query, method }) => engineProxy({
  params: {
    contract: 'comments',
    table: 'rewardPools',
    query,
  },
  method,
});
