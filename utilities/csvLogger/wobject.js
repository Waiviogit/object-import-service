const fs = require( 'fs' );
const createCsvWriter = require( 'csv-writer' ).createObjectCsvWriter;
const FILE_PATH = require( 'path' ).join( __dirname, '../../importLogs/wobjectLogs/out.csv' );
const HEADERS = [
    { id: 'datetime', title: 'Date Import' },
    { id: 'author', title: 'Author' },
    { id: 'permlink', title: 'Permlink' },
    { id: 'restaurant_id', title: 'Restaurant ID' },
    { id: 'dateUpdated', title: 'Date Updated' }
];

/**
 * Add log about import restaurant to out.csv
 * @param {Object} wobject Should include restaurant_id and dateUpdated
 * @returns {Promise<void>}
 */
exports.addLogs = async ( wobject ) => {
    const csvWriter = getCsvWriter();
    const data = [ {
        datetime: new Date().toISOString(),
        author: wobject.author, // get from objects-bot response
        permlink: wobject.permlink,
        restaurant_id: wobject.restaurant_id,
        dateUpdated: wobject.dateUpdated
    } ];

    await csvWriter.writeRecords( data );
};

const getCsvWriter = () => {
    const isFileExist = fs.existsSync( FILE_PATH );

    return createCsvWriter( {
        path: FILE_PATH,
        header: HEADERS,
        append: isFileExist
    } );
};
