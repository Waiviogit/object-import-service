const { importObjectsService, importTagsService, importObjectsFromFile, importObjectsFromCsv } = require( '../utilities/services' );
const { validateImmediatelyImport } = require( '../utilities/objectBotApi/validators' );
const { FILE_MAX_SIZE } = require( '../constants/fileFormats' );
const validators = require( 'controllers/validators' );

const importWobjects = async ( req, res, next ) => {
    const data = {
        wobjects: req.body.wobjects || [],
        immediately: req.body.immediately || false
    };
    const validateImmediately = validateImmediatelyImport( req );

    if ( !validateImmediately ) {
        return next( { status: 422, message: 'Not enough data in immediately request!' } );
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

const importDatafinityObjects = async ( req, res, next ) => {
    if ( req.file.size > FILE_MAX_SIZE ) {
        return next( { error: { status: 422, message: 'Allowed file size must be less than 100 MB' } } );
    }

    const value = validators.validate( { user: req.query.user, objectType: req.query.objectType },
        validators.importWobjects.importDatafinityObjectsSchema, next );
    if ( !value ) return;

    await importObjectsFromCsv.importObjects( { file: req.file, ...value } );
    res.status( 200 ).json( { message: 'Objects added to queue of creating!' } );
};


module.exports = {
    importWobjects,
    importTags,
    importWobjectsJson,
    importDatafinityObjects
};
