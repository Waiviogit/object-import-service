const fs = require( 'fs' );
const EventEmitter = require( 'events' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj } = require( '../../models' );
const _ = require( 'lodash' );
const { getAccount } = require( '../hiveApi/userUtil' );
const { checkVotePower } = require( '../helpers/checkVotePower' );
const permlinkGenerator = require( 'utilities/helpers/permlinkGenerator' );
const detectLanguage = require( 'utilities/helpers/detectLanguage' );
const { prepareFieldsForImport } = require( '../helpers/formBookFields' );

const importObjects = async ( { file, user, objectType, authority } ) => {
    const { result, error } = await validateUser(user, authority);
    if (error) return { error };
    let funcError;

    try {
        const path = `${moment().valueOf()}.json`;

        fs.writeFile( path, file.buffer, async( err ) => {
            if ( err ) {
                funcError = { status: 409, message: 'Error while writing a file' };

                return;

            }

            fs.readFile( path, 'utf8', async ( readError, products ) => {
                if ( readError ) {
                    funcError = { status: 409, message: 'Error while reading a file' };

                    return;
                }


                if ( products.length ) {
                    fs.unlink( path, ( deleteError ) => {
                        if ( deleteError ) {
                            console.log( 'Error while deleting a file' );
                        }
                    } );
                    await saveObjects( {
                        products: JSON.parse( products ),
                        user,
                        objectType,
                        authority
                    } );
                }
            } );
        } );
    } catch ( err ) {
        return { error: err };
    }

    if ( funcError ) {
        return { error: funcError };
    }

    return { result: true };
};

const saveObjects = async ( { products, user, objectType, authority } ) => {
    products.forEach( ( product ) => {
        product.user = user;
        product.object_type = objectType;
        if ( authority ) {
            product.authority = authority;
        }
    } );
    const { count, error } = await DatafinityObject.insertMany( products );

    if ( error ) {
        return;
    }

    const myEE = new EventEmitter();

    myEE.once( 'import', async () => startObjectImport( user, count ) );
    myEE.emit( 'import' );
};

const startObjectImport = async ( user, count ) => {
    for ( let i = 0; i < count; i++ ) {
        const { datafinityObject, error } = await DatafinityObject.getOne( { user } );

        if ( error ) {
            console.error( error.message );

            return;
        }

        const objectExists = await checkIfWobjectsExist( datafinityObject );
        // перед этим проверить есть ли сила или после? на филды еще посчитать!

        if ( !objectExists ) {
            await prepareObjectForImport( datafinityObject );
        }

        i++;
    }
};

const checkIfWobjectsExist = async ( datafinityObject ) => {
    const product = _.omit( datafinityObject, 'id' );
    const obj = await getWobjectsByKeys( product.keys );

    return !!obj;
};

const getWobjectsByKeys = async ( keys ) => {
    for ( const key of keys ) {
        const textMatch = `\"${key}\"`;
        const regexMatch = `"productId":"${key}",""productIdType":"datafinityKey"`;
        const { result, error: dbError } = await Wobj.findSameFieldBody( textMatch, regexMatch );

        if ( dbError ) {
            console.log( dbError );
        }

        return !!result;
    }
};

const validateUser = async ( user, authority ) => {
    const abilityToVote = await checkVotePower( user, authority );

    if ( !abilityToVote ) {
        return { error: { status: '409', message: 'Not enough vote power' } };
    }

    const { account, error } = await getAccount( user );

    if ( error ) {
        return { dbError: error };
    }

    const postingAuthorities = account.posting.account_auths.find( ( el ) => el[ 0 ] === process.env.BOT_ACCOUNT );

    if ( !postingAuthorities ) {
        return { error: { status: '409', message: 'Posting authorities not delegated' } };
    }


    return { result: true };
};

const prepareObjectForImport = async ( datafinityObject ) => {
    let permlink;
    let wobj;

    do {
        permlink = permlinkGenerator( datafinityObject.name );
        const { wobject, dbError } = await Wobj.getOne( { author_permlink: permlink } );

        if ( dbError ) {
            return { dbError };
        }

        if ( !wobject ) {
            break;
        }

        wobj = wobject;
    } while ( permlink === wobj.author_permlink );

    const data = {
        object_type: datafinityObject.object_type,
        author_permlink: permlink,
        author: process.env.FIELD_VOTES_BOT,
        creator: datafinityObject.user,
        default_name: datafinityObject.name,
        locale: detectLanguage( datafinityObject.name ),
        is_extending_open: true,
        is_posting_open: true,
        fields: await prepareFieldsForImport( datafinityObject )
    };
};

module.exports = { importObjects };
