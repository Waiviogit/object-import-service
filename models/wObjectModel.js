const WObjectModel = require('../database').models.WObject;

const getOne = async ({author_permlink}) => {
    try {
        const wobject = await WObjectModel.findOne({author_permlink: author_permlink}).lean();
        if (!wobject) {
            throw {status: 404, message: 'Wobject not found!'}
        }
        return {wobject}
    } catch (e) {
        return {error: e}
    }
};

const getField = async ({author, permlink, author_permlink} = {}) => {
    if (!permlink || !author_permlink) {
        return {error: {message: 'Not enough data to get Wobject Field!(Wobject model)'}}
    }
    try {
        const [field] = await WObjectModel.aggregate([
            {$match: {author_permlink: author_permlink || /.*?/}},
            {$unwind: '$fields'},
            {$match: {'fields.author': author || /.*?/, 'fields.permlink': permlink}},
            {$replaceRoot: {newRoot: '$fields'}}
        ]);
        return {field}
    } catch (error) {
        return {error}
    }
};

module.exports = {getOne, getField};
