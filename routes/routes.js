const express = require( 'express' );
const { importWobjectsController } = require( '../controllers' );
const path = require( 'path' );
const { uploadPath, uploadName } = require( '../constants/appData' );
const multer = require( 'multer' );

const storage = multer.diskStorage( {
    destination: uploadPath,
    filename: ( req, file, cb ) => {
        cb( null, uploadName );
    }
} );
const fileFilter = ( req, file, callback ) => {
    const ext = path.extname( file.originalname );

    if ( ext !== '.json' ) {
        return callback( new Error( 'File extension must be JSON' ), null );
    }
    callback( null, true );
};

const upload = multer( { storage, fileFilter } );

const routes = express.Router();
const objects = express.Router();

routes.use( '/import-objects-service', objects );

objects.route( '/import-wobjects' )
    .post( importWobjectsController.importWobjects );
objects.route( '/import-tags' )
    .post( importWobjectsController.importTags );
objects.route( '/import-wobjects-json' )
    .post( upload.single( 'wobjects' ), importWobjectsController.importWobjectsJson );

module.exports = routes;
