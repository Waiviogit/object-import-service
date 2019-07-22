const { importWobjectsDataClient } = require( './redis' );

const setImportWobjData = async ( key, data ) => {
    if ( key && data ) {
        for ( const field in data ) {
            await importWobjectsDataClient.hsetAsync( key, field, data[ field ] );
        }
    }
};

const delImportWobjData = async ( key ) => {
    if ( key ) {
        await importWobjectsDataClient.del( key );
    }
};

module.exports = {
    setImportWobjData,
    delImportWobjData
};
