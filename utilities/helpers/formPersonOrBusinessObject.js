const { OBJECTS_FROM_FIELDS } = require( '../../constants/objectTypes' );
const _ = require( 'lodash' );
const { Wobj } = require( '../../models' );
const detectLanguage = require( './detectLanguage' );
const { generateUniquePermlink } = require( './permlinkGenerator' );

exports.formPersonOrBusinessObject = async ( obj ) => {
    const publisher = _.get( obj, 'brand' );
    let wobject;

    if ( publisher ) {
        wobject = await formObject( {
            obj,
            name: publisher,
            objectType: OBJECTS_FROM_FIELDS.BUSINESS
        } ) ;
    }
    if ( wobject ) {
        return wobject;
    }

    const authors = getAuthors( obj );

    for ( const author of authors ) {
        wobject = await formObject( {
            name: author,
            obj,
            objectType: OBJECTS_FROM_FIELDS.PERSON
        } );
        if ( wobject ) {
            return wobject;
        }
    }

    return wobject;
};

const formObject = async ( { name, obj, objectType } ) => {
    const { wobject, error } = await Wobj.findOneByNameAndObjectType( name, objectType );

    if ( wobject || error ) {
        return;
    }

    return {
        object_type: objectType,
        author_permlink: await generateUniquePermlink( name ),
        author: process.env.FIELD_VOTES_BOT,
        creator: obj.user,
        default_name: name,
        locale: detectLanguage( name ),
        is_extending_open: true,
        is_posting_open: true
    };
};

const getAuthors = ( obj ) => {
    const authors = obj.features.find( ( el ) => el.key.toLowerCase().includes( 'author' ) );

    if ( authors ) {
        let author = authors.value.find( ( el ) => el.includes( '&' ) );

        if ( !author ) {
            author = [ authors.value.reduce( ( prev, current ) => ( prev.length < current.length ? prev : current ) ) ];
        } else {
            author = author.split( '&' );
        }

        return author;
    }

    return [];
};
