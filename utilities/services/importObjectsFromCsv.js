const { createReadStream } = require( 'fs' );
const fs = require( 'fs' );
const csvParser = require( 'csv-parser' );
const moment = require( 'moment' );
const { DatafinityObject } = require( '../../models' );

const importObjects = async ({ file, user, objectType }) => {
    const path = `${moment().valueOf()}.csv`;
    await fs.writeFile(path, file.buffer, async (err) => {
        console.log('err', err);
    } );
    await parseFile( { path, user, objectType });
};

const parseFile = async ({ path, user, objectType }) => {
    const products = [];

    const readStream = createReadStream(path, 'utf8');

    readStream
        .pipe(
            csvParser({
                separator: ',',
                mapHeaders: ({ header }) => {
                    return header.toLowerCase();
                },
            })
        )
        .on('data', (chunk) => {
            products.push(chunk);
        });

    readStream.on('error', (err) => {
        console.log('Error found');
    });

    await readStream.on('end', async () => {
        console.log('Finished reading using csv parser');
        if (products.length) await saveObjects({ products, user, objectType });
    });

    fs.unlink(path, (err) => {
        if (err) console.log('err', err);
    });
};

const saveObjects = async ({ products, user, objectType }) => {
    products.forEach((product) => {
        product.user = user;
        product.object_type = objectType;
    })
    const { result, error } = await DatafinityObject.insertMany(products);
    if (error) return;
};

module.exports = { importObjects };
