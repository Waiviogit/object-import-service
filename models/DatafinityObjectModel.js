const { DatafinityObject } = require( '../database' ).models;

const insertMany = async (docs) => {
    try {
        return { result: await DatafinityObject.insertMany( docs ) };
    } catch (error) {
        return { error };
    }
};

module.exports = { insertMany };
