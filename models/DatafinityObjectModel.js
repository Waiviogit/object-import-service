const { DatafinityObject } = require( '../database' ).models;

const insertMany = async (docs) => {
    try {
        const result = await DatafinityObject.insertMany( docs );

        return { count: result.length };
    } catch (error) {
        return { error };
    }
};

const getOne = async ( { user } ) => {
    try {
        const datafinityObject = await DatafinityObject.findOne( { user } ).lean();

        if ( !datafinityObject ) {
            throw { status: 404, message: 'Datafinity Object not found!' };
        }

        return { datafinityObject };
    } catch ( e ) {
        return { error: e };
    }
};

module.exports = { insertMany, getOne };
