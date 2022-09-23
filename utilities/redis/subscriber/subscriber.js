const redis = require( 'redis' );
const config = require( '../../../config' );
const { startObjectImport } = require( '../../services/importDatafinityObjects' );
const subscriber = redis.createClient( { db: config.redis.lastBlock } );

subscriber.on( 'message', async ( channel, message ) => {
    try {
        const { user, author_permlink } = JSON.parse( message );

        await startObjectImport( user, author_permlink );
    } catch ( error ) {
        console.error( error.message );
    }
} );
subscriber.subscribe( 'datafinityObject' );

module.exports = { subscriber };
