const {
  PostImportModel, PostStatusModel,
} = require('../../../models');
const { createUUID } = require('../../helpers/cryptoHelper');
const importPost = require('./postImport');

const createPostTask = async ({
  posts, user, dailyLimit, host,
}) => {
  const importId = createUUID();

  const { result } = await PostStatusModel.create({
    importId,
    user,
    postsTotal: posts.length,
    dailyLimit,
    host,
  });
  await PostImportModel.insertMany(posts);
  importPost({ importId, user });

  return { result };
};

module.exports = createPostTask;
