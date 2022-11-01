const { engineProxy } = require('./hiveEngineApi');

exports.getMarketPools = async ({ query, method }) => engineProxy({
  params: {
    contract: 'marketpools',
    table: 'pools',
    query,
  },
  method,
});
