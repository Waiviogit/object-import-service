const Joi = require( 'joi' );
const { OBJECT_TYPES } = require( '../../constants/objectTypes' );

exports.importDatafinityObjectsSchema = Joi.object().keys( {
    user: Joi.string().required(),
    objectType: Joi.string().valid( ...Object.keys( OBJECT_TYPES ) ).default( OBJECT_TYPES.BOOK ),
} );
