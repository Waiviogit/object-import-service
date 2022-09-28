const WObjectModel = require('../database').models.WObject;

const getOne = async ({ author_permlink }) => {
  try {
    const wobject = await WObjectModel.findOne({ author_permlink }).lean();

    if (!wobject) {
      throw { status: 404, message: 'Wobject not found!' };
    }
    return { wobject };
  } catch (e) {
    return { error: e };
  }
};

const getField = async ({ author, permlink, author_permlink } = {}) => {
  if (!permlink || !author_permlink) {
    return { error: { message: 'Not enough data to get Wobject Field!(Wobject model)' } };
  }
  try {
    const [field] = await WObjectModel.aggregate([
      { $match: { author_permlink: author_permlink || /.*?/ } },
      { $unwind: '$fields' },
      { $match: { 'fields.author': author || /.*?/, 'fields.permlink': permlink } },
      { $replaceRoot: { newRoot: '$fields' } },
    ]);

    return { field };
  } catch (error) {
    return { error };
  }
};

const findSameFieldBody = async (textMatch, regexMatch) => {
  try {
    const [result] = await WObjectModel.aggregate([
      {
        $match: { $text: { $search: textMatch } },
      },
      {
        $match: { 'fields.body': { $regex: regexMatch } },
      },
    ]);

    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneByNameAndObjectType = async (name, objectType) => {
  try {
    return { wobject: await WObjectModel.findOne({ object_type: objectType, default_name: { $regex: name } }).lean() };
  } catch (error) {
    return { error };
  }
};

const findOneByProductId = async (asin, objectType) => {
  try {
    return {
      wobject: await WObjectModel.findOne({
        object_type: objectType,
        'fields.name': 'productId',
        'fields.body': { $regex: asin },
      }).lean(),
    };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  getOne, getField, findSameFieldBody, findOneByNameAndObjectType, findOneByProductId,
};
