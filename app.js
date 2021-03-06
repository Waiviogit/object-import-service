const express = require( 'express' );
const logger = require( 'morgan' );
const { routes } = require( './routes' );
const { importObjectsService } = require( './utilities/services' );
const app = express();

app.use( logger( 'dev' ) );
app.use( express.json() );
app.use( express.urlencoded( { extended: false } ) );
app.use( '/', routes );

app.use( ( req, res, next ) => {
    res.header( 'Access-Control-Allow-Origin', '*' );
    res.header( 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept' );
    next();
} );

app.use( ( err, req, res, next ) => {
    if( !err.status ) {
        err.status = 500;
    }
    res.status( err.status ).json( { message: err.message } );
} );

importObjectsService.runImportWobjectsQueue();

module.exports = app;
