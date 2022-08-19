const { redisGetter } = require( '../redis' );
const { lastBlockCLient } = require( '../redis/redis' );
const commentContract = require( '../hiveEngineApi/commentsContract' );
const marketPools = require( '../hiveEngineApi/marketPoolsContract' );
const tokensContract = require( '../hiveEngineApi/tokensContract' );
const _ = require( 'lodash' );
const { HIVE_ENGINE_NODES } = require( '../../constants/requestsConstants' );

exports.calculateHiveEngineVote = async ({
    symbol, account, poolId, weight, dieselPoolId,
}) => {
    const { rewardPool, pendingClaims } = await redisGetter
        .getHashAll(`smt_pool:${symbol}`, lastBlockCLient);
    const rewards = parseFloat(rewardPool) / parseFloat(pendingClaims);

    const requests = await Promise.all([
        commentContract.getVotingPower(poolId, account),
        marketPools.getMarketPools({ query: { _id: dieselPoolId } }),
        tokensContract.getTokenBalances({ query: { symbol, account }, hostUrl: HIVE_ENGINE_NODES[ 1 ] }),
        redisGetter.getHashAll('current_price_info', lastBlockCLient),
    ]);

    for (const req of requests) {
        if (_.has(req, 'error') || _.isEmpty(req)) {
            return { engineVotePrice: 0, rshares: 0, rewards };
        }
    }
    const [votingPowers, dieselPools, balances, hiveCurrency] = requests;
    const { stake, delegationsIn } = balances[0];
    const { votingPower } = this.calculateMana(votingPowers[0]);
    const { quotePrice } = dieselPools[0];

    const finalRshares = parseFloat(stake) + parseFloat(delegationsIn);
    const power = (votingPower * weight) / 10000;

    const rshares = (power * finalRshares) / 10000;
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

    result.votingPower += ((timestamp - result.lastVoteTimestamp) * 10000)
        / (5 * 24 * 3600 * 1000);
    result.votingPower = Math.floor(result.votingPower);
    result.votingPower = Math.min(result.votingPower, 10000);

    result.downvotingPower += ((timestamp - result.lastVoteTimestamp) * 10000)
        / (5 * 24 * 3600 * 1000);
    result.downvotingPower = Math.floor(result.downvotingPower);
    result.downvotingPower = Math.min(result.downvotingPower, 10000);

    return result;
};
