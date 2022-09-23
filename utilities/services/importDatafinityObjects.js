const fs = require( 'fs' );
const EventEmitter = require( 'events' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj, ObjectType } = require( '../../models' );
const _ = require( 'lodash' );
const { getAccount } = require( '../hiveApi/userUtil' );
const { checkVotePower } = require( '../helpers/checkVotePower' );
const detectLanguage = require( 'utilities/helpers/detectLanguage' );
const { prepareFieldsForImport, addTagsIfNeeded } = require( '../helpers/bookFieldsHelper' );
const { generateUniquePermlink } = require( '../helpers/permlinkGenerator' );
const { formPersonObjects } = require( '../helpers/formPersonObject' );
const { VOTE_COST } = require( '../../constants/voteAbility' );
const { OBJECT_TYPES, OBJECTS_FROM_FIELDS } = require( '../../constants/objectTypes' );
const { addWobject, addField } = require( './importObjectsService' );

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

    await emitStart( user );
};

const startObjectImport = async ( user, authorPermlink = undefined ) => {
    let objToCreate;
    const { datafinityObject, error } = await DatafinityObject.getOne( {
        user,
        object_type: OBJECTS_FROM_FIELDS.PERSON,
        ...authorPermlink && { author_permlink: authorPermlink }
    } );

    if ( error ) {
        console.error( error.message );

        return;
    }

    objToCreate = datafinityObject;

    if ( !datafinityObject ) {
        const { datafinityObject: book, error: e } = await DatafinityObject.getOne( {
            user,
            object_type: OBJECT_TYPES.BOOK,
            ...authorPermlink && { author_permlink: authorPermlink }
        } );

        objToCreate = book;
    }

    const { result, error: validationError } = await validateUser( user, VOTE_COST.USUAL );

    if ( validationError ) {
        // поставить ттл, посчитать через сколько
    }

    const processObject = !objToCreate.author_permlink || objToCreate.object_type === OBJECTS_FROM_FIELDS.PERSON;

    if ( processObject ) {
        await processNewObject( objToCreate );
    } else if ( authorPermlink ) {
        const { wobject, error: dbError } = await Wobj.getOne( {
            author_permlink: authorPermlink
        } );

        if ( dbError ) {
            return;
        }

        await processField( objToCreate, wobject );
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
    const permlink = datafinityObject.author_permlink ? datafinityObject.author_permlink : await generateUniquePermlink( datafinityObject.name );

    return {
        object_type: datafinityObject.object_type,
        author_permlink: permlink,
        creator: datafinityObject.user,
        default_name: datafinityObject.name,
        locale: detectLanguage( datafinityObject.name ),
        is_extending_open: true,
        is_posting_open: true,
        ...datafinityObject.object_type === OBJECT_TYPES.BOOK && { fields: await prepareFieldsForImport( datafinityObject ) }
    };
};

const updateDatafinityObject = async ( obj, datafinityObject ) => {
    if ( !obj.author_permlink ) {
        await DatafinityObject.updateOne( { _id: datafinityObject._id }, { author_permlink: obj.author_permlink } );
    }

    if ( obj.fields.length ) {
        await DatafinityObject.updateOne(
            { _id: datafinityObject._id },
            { $addToSet: { fields: { $each: obj.fields } } }
        );
    } else {
        await DatafinityObject.removeOne( datafinityObject._id );
    }
};

const processNewObject = async ( datafinityObject ) => {
    if ( datafinityObject.object_type === OBJECT_TYPES.BOOK && !datafinityObject.person_permlinks.length ) {
        await createAuthors( datafinityObject );
    } else if ( datafinityObject.object_type === OBJECTS_FROM_FIELDS.PERSON ) {
        await createObject( datafinityObject );
    } else if ( datafinityObject.object_type === OBJECT_TYPES.BOOK && datafinityObject.person_permlinks.length ) {
        await createObject( datafinityObject );
    }
};

const processField = async ( datafinityObject, wobject ) => {
    if ( datafinityObject.object_type === OBJECT_TYPES.BOOK ) {
        await addTagsIfNeeded( datafinityObject, wobject );
    }
    await addField( { field: datafinityObject.fields[ 0 ], wobject } );
    const { result, error } = await DatafinityObject.findOneAndModify(
        { _id: datafinityObject._id },
        { $pop: { fields: -1 } }
    );

    if ( error ) {
        console.error( error.message );

        return;
    }

    if ( !result.fields.length ) {
        await DatafinityObject.removeOne( result._id );
        await emitStart( datafinityObject.user );
    }

    await emitStart( datafinityObject.user, datafinityObject.author_permlink );
};

const createAuthors = async ( datafinityObject ) => {
    const { datafinityObjects, fields } = await formPersonObjects( datafinityObject );

    if ( fields.length ) {
        await DatafinityObject.updateOne(
            { _id: datafinityObject._id },
            { $addToSet: { fields: { $each: fields } } } );
    }
    if ( datafinityObjects.length ) {
        await DatafinityObject.updateOne(
            { _id: datafinityObject._id },
            { $addToSet: { person_permlinks: { $each: datafinityObjects.map( ( el ) => el.author_permlink ) } } }
        );
        const { result, error } = await DatafinityObject.create( datafinityObjects );

        if ( error ) {
            console.error( error.message );

            return;
        }

        await createObject( result[ 0 ] );
    }
};

const createObject = async ( datafinityObject ) => {
    const obj = await prepareObjectForImport( datafinityObject );
    const { objectType: objType, error: dbErr } = await ObjectType.getOne( { name: obj.object_type } );

    if ( dbErr ) {
        console.error( dbErr.message );

        return;
    }

    await addWobject( { wobject: obj, existObjType: objType, addData: false } );
    await updateDatafinityObject( obj, datafinityObject );
};

const emitStart = async ( user ) => {
    const myEE = new EventEmitter();

    myEE.once( 'import', async () => startObjectImport( user ) );
    myEE.emit( 'import' );
};

module.exports = { importObjects, startObjectImport };
