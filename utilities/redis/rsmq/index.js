const RedisSMQ = require('rsmq');
const config = require('../../../config');

const importRsmqClient = new RedisSMQ({ ns: 'rsmq', options: { db: config.redis.importQueue } });

module.exports = { importRsmqClient };
