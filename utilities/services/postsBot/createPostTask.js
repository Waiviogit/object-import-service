const {
  PostImportModel, PostStatusModel,
} = require('../../../models');
const { createUUID } = require('../../helpers/cryptoHelper');
const importPost = require('./postImport');
const { IMPORT_STATUS } = require('../../../constants/appData');

const getStatus = async (user) => {
  const { result } = await PostStatusModel.findOne({
    filter: { user, status: { $in: [IMPORT_STATUS.WAITING_RECOVER, IMPORT_STATUS.ACTIVE] } },
    projection: { _id: 1 },
  });
  if (result) return IMPORT_STATUS.PENDING;
  return IMPORT_STATUS.ACTIVE;
};

const createPostTask = async ({
  posts, user, dailyLimit, host,
}) => {
  const importId = createUUID();
  const status = await getStatus(user);

  const { result } = await PostStatusModel.create({
    importId,
    user,
    postsTotal: posts.length,
    dailyLimit,
    host,
    status,
  });
  await PostImportModel.insertMany(posts.map((p) => ({ ...p, importId })));
  if (status === IMPORT_STATUS.ACTIVE) importPost({ importId, user });

  return { result };
};

module.exports = createPostTask;
