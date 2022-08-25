const { BOOK_FIELDS } = require( '../../constants/objectTypes' );
const _ = require( 'lodash' );
const moment = require( 'moment' );
const detectLanguage = require( './detectLanguage' );
const { permlinkGenerator } = require( './permlinkGenerator' );

exports.prepareFieldsForImport = async ( obj ) => {
    const fields = [];

    if ( obj.authority ) {
        fields.push( formField( {
            fieldName: 'authority',
            body: obj.authority,
            user: obj.user,
            objectName: obj.name
        } ) );
    }

    for ( const field of Object.values( BOOK_FIELDS ) ) {
        if ( field === BOOK_FIELDS.AGE_RANGE ) {
            const ageRange = obj.features.find( ( el ) => el.key.toLowerCase()
                .replace( ' ', '' ) === BOOK_FIELDS.AGE_RANGE.toLowerCase() );

            if ( ageRange ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.AGE_RANGE,
                    user: obj.user,
                    body: ageRange.value,
                    objectName: obj.name
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.DIMENSIONS ) {
            const dimension = _.get( obj, 'dimension' );

            if ( dimension ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.DIMENSIONS,
                    objectName: obj.name,
                    body: dimension,
                    user: obj.user
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.LANGUAGE ) {
            const language = obj.features.find( ( el ) => el.key.toLowerCase() === BOOK_FIELDS.LANGUAGE );

            if ( language ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.LANGUAGE,
                    body: language.value,
                    user: obj.user,
                    objectName: obj.name
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.PUBLICATION_DATE ) {
            const publicationDate = obj.features.find( ( el ) => el.key.toLowerCase()
                .replace( ' ', '' ) === BOOK_FIELDS.PUBLICATION_DATE.toLowerCase() );


            if ( publicationDate ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.PUBLICATION_DATE,
                    body: publicationDate.value.reduce( ( prev, current ) =>
                        ( moment().unix( prev ) > moment().unix( current ) ? prev : current ) ),
                    user: obj.user,
                    objectName: obj.name
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.TAG_GATEGORY ) {
            for ( const category of obj.categories ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.TAG_GATEGORY,
                    body: category,
                    user: obj.user,
                    objectName: obj.name
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.WEIGHT ) {
            const weight = _.get( obj, 'weight' );

            if ( weight ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.WEIGHT,
                    body: weight,
                    user: obj.user,
                    objectName: obj.name
                } ) );
            }
        }
        if ( field === BOOK_FIELDS.PRINT_LENGTH ) {
            const printLength = obj.features.find( ( el ) => el.key.toLowerCase() === 'pages' );

            if ( printLength ) {
                fields.push( formField( {
                    fieldName: BOOK_FIELDS.PRINT_LENGTH,
                    body: printLength.value[ 0 ],
                    user: obj.user,
                    objectName: obj.name
                } ) );
            }
        }

        if ( field === BOOK_FIELDS.OPTIONS ) {
            // format
        }
        if ( field === BOOK_FIELDS.PRODUCT_ID ) {
            //
        }
    }

    return fields;
};

const formField = ( { fieldName, objectName, user, body } ) => {
    return {
        weight: 1,
        locale: detectLanguage( objectName ),
        creator: user,
        author: process.env.FIELD_VOTES_BOT,
        permlink: permlinkGenerator( user ),
        name: fieldName,
        body
    };
};
