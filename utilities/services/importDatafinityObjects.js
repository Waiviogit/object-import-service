const fs = require( 'fs' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj } = require( '../../models' );
const _ = require( 'lodash' );
const { getAccount } = require( '../hiveApi/userUtil' );
const { checkVotePower } = require( '../helpers/checkVotePower' );
const permlinkGenerator = require('utilities/helpers/permlinkGenerator');
const detectLanguage = require('utilities/helpers/detectLanguage');
const { AUTHORITY_FIELD_OPTIONS, REQUIRED_BOOK_FIELDS_NAMES } = require( '../../constants/objectTypes' );

const importObjects = async ({ file, user, objectType, authority }) => {
    const { result, error } = await validateUser(user);
    if (error) return { error };

    const path = `${moment().valueOf()}.json`;
    fs.writeFile(path, file.buffer, async(err) => {
        if (err) {
            console.log('Error while writing a file');

            return;

        }

        fs.readFile(path, 'utf8', async (readError, products ) => {
            if (readError) {
                console.log('Error while reading a file');

                return;
            }


            if (products.length) {
                fs.unlink(path, (deleteError) => {
                    if (deleteError) console.log('Error while deleting a file');
                });
                await saveObjects( {
                    products: JSON.parse( products ),
                    user,
                    objectType,
                    authority
                } );
            }
        });
    } );

    return { result: true };
};

const saveObjects = async ({ products, user, objectType, authority }) => {
    products.forEach((product) => {
        product.user = user;
        product.object_type = objectType;
        if (authority) product.authority = authority;
    });
    const { result, error } = await DatafinityObject.insertMany(products);
    if (error) return;

    const { objectsToAppend, objectsToCreate } = await checkIfWobjectsExist(result);
    if (objectsToCreate.length) {
        const { createObjectsForImport, dbError } = await prepareObjectsForImport( {
            objects: objectsToCreate,
            user,
            objType: objectType,
            authority
        } );
        if (dbError) return { error: dbError };
    }
};

const checkIfWobjectsExist = async (products) => {
    const objectsToAppend = [];
    const objectsToCreate = [];
    for (const el of products) {
        const product = _.omit(el.toObject(), 'id');
        const obj = await getWobjectsByKeys(product.keys);
        obj ? objectsToAppend.push(product) : objectsToCreate.push(product);
    }

    return { objectsToAppend, objectsToCreate };
};

const getWobjectsByKeys = async (keys) => {
    for (const key of keys) {
        const textMatch = `\"${key}\"`;
        const regexMatch = `"productId":"${key}",""productIdType":"datafinityKey"`;
        const { result, error: dbError } = await Wobj.findSameFieldBody(textMatch, regexMatch);
        if (dbError) console.log(dbError);

        if (result) return result;
    }
};

const validateUser = async ( user ) => {
    const abilityToVote = await checkVotePower(user);
    if (!abilityToVote) return { error: { status: '409', message: 'Not enough vote power' } };

    const { account, error } = await getAccount(user);
    if (error) return { dbError: error };

    const postingAuthorities = account.posting.account_auths.find((el) => el[0] === process.env.BOT_ACCOUNT);
    if (!postingAuthorities) return { error: { status: '409', message: 'Posting authorities not delegated' } };


    return { result: true };
};

const prepareObjectsForImport = async ({ objects, user, objType, authority }) => {
    const createObjectsForImport = [];
    for (const obj of objects) {
        let permlink;
        let wobj;
        do {
            permlink = permlinkGenerator( obj.name );
            const { wobject, dbError } = await Wobj.getOne( { author_permlink: permlink } );
            if (dbError) return { dbError };

            if (!wobject) break;

            wobj = wobject;
        } while (permlink === wobj.author_permlink);
        const data = {
            object_type: objType,
            author_permlink: permlink,
            author: process.env.FIELD_VOTES_BOT,
            creator: user,
            default_name: obj.name,
            locale: detectLanguage(obj.name),
            is_extending_open: true,
            is_posting_open: true,
            parentAuthor: objectType ? objectType.author : '',
            parentPermlink: objectType ? objectType.permlink : '',
            authority: getWobjectAuthority(authority, user),
            fields: prepareFieldsForImport(obj, user)
        };
        createObjectsForImport.push(data);
    }

    return { createObjectsForImport };
};

const prepareFieldsForImport = (obj, user) => {
    const fields = [];
    for (const field of Object.keys( REQUIRED_BOOK_FIELDS_NAMES )) {
        if (field === REQUIRED_BOOK_FIELDS_NAMES.NAME) {
            fields.push(formField({
                fieldName: REQUIRED_BOOK_FIELDS_NAMES.NAME,
                user,
                body: obj.name,
                objectName: obj.name
            }));
        }
        if (field === REQUIRED_BOOK_FIELDS_NAMES.AGE_RANGE) {
            const ageRange = obj.features.find((el) => el.key.toLowerCase()
                .replace(' ', '') === REQUIRED_BOOK_FIELDS_NAMES.AGE_RANGE.toLowerCase());
            if (ageRange) {
                fields.push(formField( {
                    fieldName: REQUIRED_BOOK_FIELDS_NAMES.AGE_RANGE,
                    user,
                    body: ageRange.value,
                    objectName: obj.name
                }));
            }
        }
        if (field === REQUIRED_BOOK_FIELDS_NAMES.AUTHORS) {
            const authors = obj.features.find((el) => el.key === 'Author' || el.key === 'author');
            if (authors) {
                fields.push(formField({
                    fieldName: REQUIRED_BOOK_FIELDS_NAMES.AUTHORS,
                    objectName: obj.name,
                    body: authors.value,
                    user
                }));
            }
        }
        if (field === REQUIRED_BOOK_FIELDS_NAMES.DIMENSIONS) {

        }
        // и тд...
    }

    return fields;
};

const getWobjectAuthority = (authority, user) => {
    if (authority === AUTHORITY_FIELD_OPTIONS.OWNERSHIP) return { administrative: [], ownership: [ user ] };

    if (authority === AUTHORITY_FIELD_OPTIONS.ADMINISTRATIVE) return { administrative: [ user ], ownership: [] }

    return {};
};

const formField = ({ fieldName, objectName, user, body }) => {
    return {
        weight: 1,
        locale: detectLanguage(objectName),
        creator: user,
        author: process.env.FIELD_VOTES_BOT,
        permlink: permlinkGenerator( user ),
        name: fieldName,
        body
    };
};

module.exports = { importObjects };
