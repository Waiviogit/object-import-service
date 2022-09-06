const { OBJECTS_FROM_FIELDS } = require( '../../constants/objectTypes' );
const _ = require( 'lodash' );
const { Wobj } = require( '../../models' );
const detectLanguage = require( './detectLanguage' );
const { generateUniquePermlink } = require( './permlinkGenerator' );

exports.formPersonOrBusinessObject = async ( obj ) => {
    const publisher = _.get( obj, 'brand' );
    let wobject;

    if ( !publisher ) {
        return { publisherCreated: true };
    }

    if ( !obj.publisherCreated && publisher ) {
        wobject = await formObject( {
            obj,
            name: publisher,
            objectType: OBJECTS_FROM_FIELDS.BUSINESS
        } ) ;
    }
    if ( wobject ) {
        return { wobject, publisherCreated: true };
    }

    if ( !obj.authorCreated ) {
        const authors = this.getAuthors( obj );

        if ( !authors.length ) {
            return { authorCreated: true };
        }

        for ( const author of authors ) {
            wobject = await formObject( {
                name: author,
                obj,
                objectType: OBJECTS_FROM_FIELDS.PERSON
            } );
            if ( wobject ) {
                return !author === authors[ authors.length - 1 ] ? { wobject } : { wobject, authorCreated: true };
            }
        }
    }

    return { wobject };
};

const formObject = async ( { name, obj, objectType } ) => {
    const { wobject, error } = await Wobj.findOneByNameAndObjectType( name, objectType );

    if ( wobject || error ) {
        return;
    }

    return {
        object_type: objectType,
        author_permlink: await generateUniquePermlink( name ),
        creator: obj.user,
        default_name: name,
        locale: detectLanguage( name ),
        is_extending_open: true,
        is_posting_open: true
    };
};

exports.getAuthors = ( obj ) => {
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
