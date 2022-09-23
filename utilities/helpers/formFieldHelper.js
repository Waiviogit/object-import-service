const detectLanguage = require( './detectLanguage' );
const { permlinkGenerator } = require( './permlinkGenerator' );

exports.formField = ( { fieldName, objectName, user, body, categoryItem = false, id } ) => {
    return {
        weight: 1,
        locale: detectLanguage( objectName ),
        creator: user,
        permlink: permlinkGenerator( user ),
        name: fieldName,
        body,
        ...categoryItem && { id, tagCategory: 'Tags' }
    };
};
