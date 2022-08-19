const { redisGetter } = require( '../redis' );
const { lastBlockCLient } = require( '../redis/redis' );
const { Client } = require('@hiveio/dhive');
const { NODE_URLS } = require( '../../constants/requestsConstants' );

exports.getPostNodes = async (key) => {
    const result = await redisGetter.getHashAll(key, lastBlockCLient);

    if (!result) return NODE_URLS;

    const nodes = JSON.parse(result.nodes, null);

    if (!nodes) return NODE_URLS;

    return nodes;
};

exports.getClient = async (key) => {
    const nodes = await this.getPostNodes(key);

    return new Client(nodes, { failoverThreshold: 0, timeout: 10000 });
};
