const axios = require( 'axios' );
const { objectsBot } = require( '../../config' );
const { appendObjectValidate } = require( './validators' );
const _ = require( 'lodash' );
const URL = objectsBot.OBJECT_BOT_HOST_URL + objectsBot.APPEND_OBJECT_ROUTE;

const send = async ( data ) => {
    const { error } = await appendObjectValidate( data );

    if ( error ) {
        console.error( error );
        return { error };
    }
    while ( true ) {
        try {
            const { data: response } = await axios.post( URL, data );

            if ( response && response.transactionId && response.parentAuthor && response.parentPermlink && response.author && response.permlink ) {
                return response;
            }
            return { error: { message: 'Not enough response data!' } };

        } catch ( err ) {
            if ( _.get( err, 'response.status' ) === 503 || _.get( err, 'statusCode' ) === 503 ) { // not enough mana or limit on creating post
                await new Promise( ( r ) => setTimeout( r, 1000 ) );
            } else {
                return { error: err };
            }
        }
    }


};

module.exports = { send };
