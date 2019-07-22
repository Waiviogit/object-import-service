const { importWobjectsDataClient } = require( './redis' );

const getHashAll = async function ( key ) {
    const res = await importWobjectsDataClient.hgetallAsync( key );

    return res;
};

module.exports = { getHashAll };
