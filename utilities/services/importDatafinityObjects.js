const fs = require( 'fs' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj } = require( '../../models' );
const _ = require( 'lodash' );
const BigNumber = require( 'bignumber.js' );
const engineOperations = require( '../hiveEngine/hiveEngineOperations' );
const { getAccount } = require( '../hiveApi/userUtil' );
const { VOTE_EVALUATION } = require( '../../constants/requestsConstants' );

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

    return { result };
};

const saveObjects = async ({ products, user, objectType, authority }) => {
    products.forEach((product) => {
        product.user = user;
        product.object_type = objectType;
        if (authority) product.authority = authority;
    });
    const { result, error } = await DatafinityObject.insertMany(products);
    if (error) return;

    await checkIfWobjectsExist(result);
};

const checkIfWobjectsExist = async (products) => {
    const objectsToAppend = [];
    const objectsToCreate = [];
    for (const el of products) {
        const product = _.omit(el.toObject(), 'id');
        const obj = await getWobjectsByKeys(product.keys);
        obj ? objectsToAppend.push(product) : objectsToCreate.push(product);
    }
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
    const { engineVotePrice } = await engineOperations.calculateHiveEngineVote( {
        symbol: VOTE_EVALUATION.TOKEN_SYMBOL,
        account: user,
        poolId: VOTE_EVALUATION.POOL_ID,
        dieselPoolId: VOTE_EVALUATION.DIESEL_POOL_ID,
        weight: VOTE_EVALUATION.WEIGHT * 100
    } );
    if (new BigNumber(engineVotePrice).lt(0.01)) return { error: { status: '409', message: 'Not enough vote power' } };

    const { account, error } = await getAccount(user);
    if (error) return { error };

    const postingAuthorities = account.posting.account_auths.find((el) => el[0] === 'bla');
    if (!postingAuthorities) return { error: { status: '409', message: 'Posting authorities not delegated' } };


    return { result: true };
};

module.exports = { importObjects };
