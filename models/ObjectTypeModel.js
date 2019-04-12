const {ObjectType} = require('../database').models;

const getOne = async ({name}) => {
    try {
        const objectType = await ObjectType.findOne({name: name}).lean();
        if (!objectType) {
            throw {status: 404, message: 'Object Type not found!'}
        }
        return {objectType}
    } catch (e) {
        return {error: e}
    }
};

module.exports = {getOne}
