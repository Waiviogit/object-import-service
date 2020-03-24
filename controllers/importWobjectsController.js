const { importObjectsService, importTagsService, importObjectsFromFile } = require( '../utilities/services' );
const { validateApiKey } = require( '../utilities/objectBotApi/validators' );

const importWobjects = async ( req, res, next ) => {
    const data = {
        wobjects: req.body.wobjects || [],
        immediately: req.body.immediately || false
    };

    if ( !( data.immediately && req.headers.API_KEY && validateApiKey( req.headers.API_KEY ) ) ) {
        return next( { error: { status: 422, message: 'Not valid data in immediately request' } } );
    }
    await importObjectsService.addWobjectsToQueue( data );
    console.log( 'wobjects added to queue' );
    res.status( 200 ).json( { message: 'Wobjects added to queue of creating!' } );
}; // add wobjects to queue for send it to objects-bot and write it to blockchain

const importTags = async ( req, res, next ) => {
    const tags = req.body.tags || [];

    await importTagsService.importTags( { tags } );
    res.status( 200 ).json( { message: 'Wobjects by tags added to queue of creating' } );
};

const importWobjectsJson = async ( req, res, next ) => {
    const { result, error } = await importObjectsFromFile.importWobjects();

    if ( error ) {
        return next( error );
    }
    res.status( 200 ).json( { message: 'Wobjects added to queue of creating!' } );
};


module.exports = {
    importWobjects,
    importTags,
    importWobjectsJson
};
