const Joi = require( 'joi' );
const { OBJECT_TYPES, AUTHORITY_FIELD_OPTIONS } = require( '../../constants/objectTypes' );

exports.importDatafinityObjectsSchema = Joi.object().keys( {
    user: Joi.string().required(),
    objectType: Joi.string().valid( ...Object.values( OBJECT_TYPES ) ).default( OBJECT_TYPES.BOOK ),
    authority: Joi.string().valid( ...Object.values( AUTHORITY_FIELD_OPTIONS ) )
} );
