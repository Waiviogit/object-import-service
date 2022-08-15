const multer = require( 'multer' );
const { uploadPath, uploadName } = require( '../constants/appData' );
const path = require( 'path' );
const { ALLOWED_FILES_FORMATS } = require( '../constants/fileFormats' );


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

const csvFileFilter = ( reg, file, cb ) => {
    if ( !file ) return cb( new Error( 'Absent file' ), null );

    const isFile = ALLOWED_FILES_FORMATS.some( ( item ) => item === file.mimetype );

    if ( !isFile ) return cb( new Error( 'Incorrect file format' ), null );

    return cb( null, true );
};

exports.upload = multer( { storage, fileFilter } );

exports.csvUpload = multer( { fieldname: 'file', fileFilter: csvFileFilter } );