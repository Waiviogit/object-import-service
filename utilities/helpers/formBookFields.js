const { BOOK_FIELDS, OBJECTS_FROM_FIELDS, WEIGHT_UNITS, DIMENSION_UNITS, DATAFINITY_KEY, OBJECT_IDS } = require( '../../constants/objectTypes' );
const _ = require( 'lodash' );
const moment = require( 'moment' );
const detectLanguage = require( './detectLanguage' );
const { permlinkGenerator } = require( './permlinkGenerator' );
const { getAuthors } = require( './formPersonOrBusinessObject' );
const { Wobj } = require( '../../models' );

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

    for ( const fieldsElementHandle of Object.values( BOOK_FIELDS ) ) {
        const field = await fieldsHandle[ fieldsElementHandle ]( obj );

        if ( field && !field.length ) {
            fields.push( field );
        } else if ( field && field.length ) {
            fields.push( ...field );
        }
    }

    return fields;
};

const formField = ( { fieldName, objectName, user, body } ) => {
    return {
        weight: 1,
        locale: detectLanguage( objectName ),
        creator: user,
        permlink: permlinkGenerator( user ),
        name: fieldName,
        body
    };
};

const ageRange = ( obj ) => {
    const age = obj.features.find( ( el ) => el.key.toLowerCase()
        .replace( ' ', '' ) === BOOK_FIELDS.AGE_RANGE.toLowerCase() );

    if ( age ) {
        return formField( {
            fieldName: BOOK_FIELDS.AGE_RANGE,
            user: obj.user,
            body: age.value.length ? age.value[ 0 ] : age.value,
            objectName: obj.name
        } );
    }
};

const dimensions = ( obj ) => {
    const dimension = _.get( obj, 'dimension' );

    if ( dimension ) {
        const [ value1, value2, value3 ] = dimension.split( 'x' );

        return formField( {
            fieldName: BOOK_FIELDS.DIMENSIONS,
            objectName: obj.name,
            body: {
                value1: parseFloat( value1 ),
                value2: parseFloat( value2 ),
                value3: parseFloat( value3 ),
                unit: DIMENSION_UNITS.find( ( el ) => el.includes( value3.trim().split( ' ' )[ 1 ] ) )
            },
            user: obj.user
        } );
    }
};

const language = ( obj ) => {
    const lang = obj.features.find( ( el ) => el.key.toLowerCase() === BOOK_FIELDS.LANGUAGE );

    if ( lang ) {
        return formField( {
            fieldName: BOOK_FIELDS.LANGUAGE,
            body: lang.value.length ? lang.value[ 0 ] : lang.value,
            user: obj.user,
            objectName: obj.name
        } );
    }
};

const publicationDate = ( obj ) => {
    const date = obj.features.find( ( el ) => el.key.toLowerCase()
        .replace( ' ', '' ) === BOOK_FIELDS.PUBLICATION_DATE.toLowerCase() );


    if ( date ) {
        return formField( {
            fieldName: BOOK_FIELDS.PUBLICATION_DATE,
            body: date.value.reduce( ( prev, current ) =>
                ( moment().unix( prev ) > moment().unix( current ) ? prev : current ) ),
            user: obj.user,
            objectName: obj.name
        } );
    }
};

const tag = ( obj ) => {
    const fields = [];

    for ( const category of obj.categories ) {
        fields.push( formField( {
            fieldName: BOOK_FIELDS.TAG,
            body: category,
            user: obj.user,
            objectName: obj.name
        } ) );
    }

    if ( fields.length ) {
        return fields;
    }
};

const weight = ( obj ) => {
    const objWeight = _.get( obj, BOOK_FIELDS.WEIGHT );

    if ( objWeight ) {
        const [ value, unit ] = objWeight.split( ' ' );
        const singUnit = !unit.endsWith( 's' ) ? unit.trim() : unit.trim().slice( 0, unit.length - 2 );

        return formField( {
            fieldName: BOOK_FIELDS.WEIGHT,
            body: JSON.stringify( {
                value: value.trim(),
                unit: WEIGHT_UNITS.find( ( el ) => el.includes( singUnit ) )
            } ),
            user: obj.user,
            objectName: obj.name
        } );
    }
};

const printLength = ( obj ) => {
    const printLen = obj.features.find( ( el ) => el.key.toLowerCase().includes( 'pages' ) );

    if ( printLen ) {
        return formField( {
            fieldName: BOOK_FIELDS.PRINT_LENGTH,
            body: printLen.value[ 0 ].split( ' ' )[ 0 ],
            user: obj.user,
            objectName: obj.name
        } );
    }
};

const authors = async ( obj ) => {
    const objAuthors = getAuthors( obj );
    const fields = [];

    for ( const author of objAuthors ) {
        const field = await formFieldByExistingObject( {
            obj,
            name: author,
            fieldName: BOOK_FIELDS.AUTHORS,
            objectType: OBJECTS_FROM_FIELDS.PERSON
        } );

        if ( field ) {
            fields.push( field );
        }
    }

    if ( fields.length ) {
        return fields;
    }
};

const formFieldByExistingObject = async ( { obj, name, objectType, fieldName } ) => {
    const { wobject, error } = await Wobj.findOneByNameAndObjectType( name, objectType );

    if ( !wobject || error ) {
        return;
    }

    return formField( {
        fieldName,
        body: JSON.stringify( {
            name,
            authorPermlink: wobject.author_permlink
        } ),
        user: obj.user,
        objectName: obj.name
    } );
};

const publisher = async ( obj ) => {
    const objPublisher = _.get( obj, 'brand' );

    if ( objPublisher ) {
        return formFieldByExistingObject( {
            obj,
            name: objPublisher,
            objectType: OBJECTS_FROM_FIELDS.BUSINESS,
            fieldName: BOOK_FIELDS.PUBLISHER
        } );
    }
};

const options = ( obj ) => {
    const formats = obj.features.find( ( el ) => el.key.toLowerCase().includes( 'format' ) );
    const fields = [];

    for ( let count = 0; count < formats.value.length; count++ ) {
        fields.push( formField( {
            fieldName: BOOK_FIELDS.OPTIONS,
            objectName: obj.name,
            user: obj.user,
            body: JSON.stringify( {
                category: 'format',
                value: formats.value[ count ],
                position: count,
                image: obj.imageURLs[ count ]
            } )
        } ) );
    }

    if ( fields.length ) {
        return fields;
    }
};

const productId = ( obj ) => {
    const fields = [];

    for ( const key of obj.keys ) {
        fields.push( formField( {
            fieldName: BOOK_FIELDS.PRODUCT_ID,
            objectName: obj.name,
            user: obj.user,
            body: JSON.stringify( {
                productId: key,
                productIdType: DATAFINITY_KEY
            } )
        } ) );
    }

    const ids = Object.entries( obj ).filter( ( el ) => OBJECT_IDS.some( ( id ) => el.includes( id ) ) );

    for ( const id of ids ) {
        if ( id[ 1 ].length ) {
            fields.push( formField( {
                fieldName: BOOK_FIELDS.PRODUCT_ID,
                objectName: obj.name,
                user: obj.user,
                body: JSON.stringify( {
                    productId: id[ 1 ],
                    productIdType: id[ 0 ]
                } )
            } ) );
        }
    }

    if ( fields.length ) {
        return fields;
    }
};

const fieldsHandle = {
    ageRange,
    dimensions,
    language,
    publicationDate,
    tag,
    weight,
    printLength,
    authors,
    publisher,
    options,
    productId
};
