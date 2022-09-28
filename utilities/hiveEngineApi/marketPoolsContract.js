const { engineProxy } = require('./hiveEngineApi');

exports.getMarketPools = async ({ query }) => engineProxy({
  params: {
    contract: 'marketpools',
    table: 'pools',
    query,
  },
});
