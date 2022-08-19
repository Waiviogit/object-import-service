const { engineProxy } = require( './hiveEngineApi' );

exports.getTokenBalances = async ({ query, hostUrl }) => engineProxy({
    params: {
        contract: 'tokens',
        table: 'balances',
        query,
    },
    hostUrl,
});
