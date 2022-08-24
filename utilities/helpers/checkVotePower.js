const engineOperations = require( '../hiveEngine/hiveEngineOperations' );
const { VOTE_EVALUATION } = require( '../../constants/requestsConstants' );
const BigNumber = require( 'bignumber.js' );

exports.checkVotePower = async (user, authority) => {
    const { engineVotePrice } = await engineOperations.calculateHiveEngineVote( {
        symbol: VOTE_EVALUATION.TOKEN_SYMBOL,
        account: user,
        poolId: VOTE_EVALUATION.POOL_ID,
        dieselPoolId: VOTE_EVALUATION.DIESEL_POOL_ID,
        weight: VOTE_EVALUATION.WEIGHT
    } );

    return authority ? !new BigNumber(engineVotePrice).lt(0.0001) : !new BigNumber(engineVotePrice).lt(0.001);
};
