const redis = require( 'redis' );
const bluebird = require( 'bluebird' );
const config = require( '../../config' );

bluebird.promisifyAll( redis.RedisClient.prototype );
bluebird.promisifyAll( redis.Multi.prototype );
const importWobjectsDataClient = redis.createClient( process.env.REDISCLOUD_URL );
const importWobjectsQueueClient = redis.createClient( process.env.REDISCLOUD_URL );

importWobjectsDataClient.select( config.redis.importWobjData );
importWobjectsQueueClient.select( config.redis.importQueue );

module.exports = { importWobjectsDataClient, importWobjectsQueueClient };
