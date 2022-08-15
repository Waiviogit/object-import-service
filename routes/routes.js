const express = require( 'express' );
const { importWobjectsController } = require( '../controllers' );
const { upload, csvUpload } = require( '../validators/fileValidator' );

const routes = express.Router();
const objects = express.Router();

routes.use( '/import-objects-service', objects );

objects.route( '/import-wobjects' )
    .post( importWobjectsController.importWobjects );
objects.route( '/import-tags' )
    .post( importWobjectsController.importTags );
objects.route( '/import-wobjects-json' )
    .post( upload.single( 'wobjects' ), importWobjectsController.importWobjectsJson );
objects.route( '/import-objects-csv' ).post(
    csvUpload.single( 'file' ),
    importWobjectsController.importDatafinityObjects
);

module.exports = routes;
