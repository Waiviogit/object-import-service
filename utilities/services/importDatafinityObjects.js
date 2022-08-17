const fs = require( 'fs' );
const moment = require( 'moment' );
const { DatafinityObject, Wobj } = require( '../../models' );
const _ = require( 'lodash' );

const importObjects = async ({ file, user, objectType, authority }) => {
    await validateUser(user);
    const path = `${moment().valueOf()}.json`;
    fs.writeFile(path, file.buffer, async(err) => {
        if (err) {
            console.log('Error while writing a file');

            return;

        }

        fs.readFile(path, 'utf8', async (error, products ) => {
            if (error) {
                console.log('Error while reading a file');

                return;
            }

            if (products.length) {
                await saveObjects( {
                    products: JSON.parse( products ),
                    user,
                    objectType,
                    authority
                } );
            }
            fs.unlink(path, (deleteError) => {
                if (deleteError) console.log('Error while deleting a file');
            });
        });
    } );
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

const validateUser = async (user) => {

};

module.exports = { importObjects };
