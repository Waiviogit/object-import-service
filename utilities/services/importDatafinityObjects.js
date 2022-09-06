const fs = require( 'fs' );
const EventEmitter = require( 'events' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj, ObjectType } = require( '../../models' );
const _ = require( 'lodash' );
const { getAccount } = require( '../hiveApi/userUtil' );
const { checkVotePower } = require( '../helpers/checkVotePower' );
const detectLanguage = require( 'utilities/helpers/detectLanguage' );
const { prepareFieldsForImport, addTags } = require( '../helpers/formBookFields' );
const { generateUniquePermlink } = require( '../helpers/permlinkGenerator' );
const { formPersonOrBusinessObject } = require( '../helpers/formPersonOrBusinessObject' );
const { addWobject, addField } = require( './importObjectsService' );
const { VOTE_COST } = require( '../../constants/voteAbility' );
const { DATAFINITY_KEY, BOOK_FIELDS } = require( '../../constants/objectTypes' );

const importObjects = async ( { file, user, objectType, authority } ) => {
    const { result, error } = await validateUser( user, VOTE_COST.INITIAL );

    if ( error ) {
        return { error };
    }
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

    myEE.once( 'import', async () => startObjectImport( user ) );
    myEE.emit( 'import' );
};

const startObjectImport = async ( user ) => {
    let objectToCreate;

    do {
        const { result, error: validationError } = await validateUser( user, VOTE_COST.USUAL );

        if ( validationError ) {
            // поставить сабскрайбера, пример есть на старых кампаниях! ттл и прерывание цикла
        }
        const { datafinityObject, error } = await DatafinityObject.getOne( { user } );

        objectToCreate = datafinityObject;

        if ( error ) {
            console.error( error.message );

            return;
        }

        const wobject = await checkIfWobjectsExist( datafinityObject );

        if ( !wobject ) {
            await processNewObject( datafinityObject );
        } else {
            await processField( datafinityObject, wobject );
        }
    } while ( objectToCreate );
};

const checkIfWobjectsExist = async ( datafinityObject ) => {
    return getWobjectsByKeys( datafinityObject.keys );
};

const getWobjectsByKeys = async ( keys ) => {
    for ( const key of keys ) {
        const textMatch = `\"${key}\"`;
        const regexMatch = JSON.stringify( {
            productId: key,
            productIdType: DATAFINITY_KEY
        } );
        const { result, error: dbError } = await Wobj.findSameFieldBody( textMatch, regexMatch );

        if ( dbError ) {
            console.log( dbError );
        }

        return result;
    }
};

const validateUser = async ( user ) => {
    const abilityToVote = await checkVotePower( user );

    if ( !abilityToVote ) {
        return { error: { status: '409', message: 'Not enough vote power' } };
    }

    const { account, error } = await getAccount( user );

    if ( error ) {
        return { error };
    }

    const postingAuthorities = account.posting.account_auths.find( ( el ) => el[ 0 ] === process.env.FIELD_VOTES_BOT );

    if ( !postingAuthorities ) {
        return { error: { status: '409', message: 'Posting authorities not delegated' } };
    }


    return { result: true };
};

const prepareObjectForImport = async ( datafinityObject ) => {
    const permlink = generateUniquePermlink( datafinityObject.name );

    return {
        object_type: datafinityObject.object_type,
        author_permlink: permlink,
        creator: datafinityObject.user,
        default_name: datafinityObject.name,
        locale: detectLanguage( datafinityObject.name ),
        is_extending_open: true,
        is_posting_open: true,
        fields: await prepareFieldsForImport( datafinityObject )
    };
};

const updateDatafinityObject = async ( obj, datafinityObject ) => {
    if ( obj.fields.length ) {
        await DatafinityObject.updateOne( { _id: datafinityObject._id }, { fields: obj.fields } );
    } else {
        await DatafinityObject.removeOne( datafinityObject._id );
    }
};

const processNewObject = async ( datafinityObject ) => {
    const { wobject, authorCreated, publisherCreated } = await formPersonOrBusinessObject( datafinityObject );

    if ( wobject ) {
        const { objectType, error: dbError } = await ObjectType.getOne( { name: wobject.object_type } );

        if ( dbError ) {
            console.error( error.message );

            return;
        }
        await addWobject( { wobject, existObjType: objectType, addData: false } );
        await DatafinityObject.updateOne(
            { _id: datafinityObject._id },
            { ...authorCreated && { authorCreated: true },
                ...publisherCreated && { publisherCreated: true } } );

        return;
    }


    const obj = await prepareObjectForImport( datafinityObject );
    const { objectType: objType, error: dbErr } = await ObjectType.getOne( { name: obj.object_type } );

    if ( dbErr ) {
        console.error( dbErr.message );

        return;
    }

    await addWobject( { wobject: obj, existObjType: objType, addData: false } );
    await updateDatafinityObject( obj, datafinityObject );
};

const processField = async ( datafinityObject, wobject ) => {
    await addTagsIfNeeded( datafinityObject, wobject );
    await addField( { field: datafinityObject.fields[ 0 ], wobject } );
    await DatafinityObject.updateOne( { _id: datafinityObject._id }, { $pop: { fields: -1 } } );
};

const addTagsIfNeeded = async ( datafinityObject, wobject ) => {
    const tagCategory = wobject.fields.find( ( field ) => field.name === BOOK_FIELDS.TAG_CATEGORY );
    const categoryItems = wobject.fields.filter( ( field ) => field.name === BOOK_FIELDS.CATEGORY_ITEM && field.id === tagCategory.id );
    const categoryItemsToSave = datafinityObject.fields.filter( ( field ) => field.name === BOOK_FIELDS.CATEGORY_ITEM );

    if ( !categoryItems.length && !categoryItemsToSave.length ) {
        const fields = await addTags( datafinityObject, tagCategory.id );

        if ( fields.length ) {
            await DatafinityObject.updateOne(
                { _id: datafinityObject._id },
                { $addToSet: { fields: { $each: fields } } }
            );
        }
    }
};

module.exports = { importObjects };
