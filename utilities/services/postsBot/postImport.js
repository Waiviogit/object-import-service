const {
  PostImportModel, PostStatusModel,
} = require('../../../models');
const {
  validatePostingToRun,
  checkAndIncrementDailyLimit,
  setContinueTTlByAnotherKeyExpire,
  setContinueTtl,
} = require('../../../validators/accountValidator');
const { IMPORT_TYPES, IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { broadcastComment } = require('../../hiveApi/broadcastUtil');
const { createPostPermlink } = require('../../helpers/permlinkGenerator');

const KEY_DAILY_LIMIT = 'dailyLimitPostsImport';
const CONTINUE_TTL_SEC = 60 * 5;

const publishPost = async ({
  author, body, title, tags,
}) => {
  const permlink = await createPostPermlink({ author, title });

  const { result, error } = await broadcastComment({
    author,
    permlink,
    body,
    parent_author: '',
    parent_permlink: '',
    title,
    json_metadata: JSON.stringify({ tags }),
    key: process.env.FIELD_VOTES_BOT_KEY,
  });

  if (error) return { error };
  if (result) return { result };
};

const importPost = async ({ importId, user }) => {
  const validRc = await validatePostingToRun({
    user, importId, type: IMPORT_TYPES.POST_IMPORT,
  });
  if (!validRc) return;
  const importInfo = await PostStatusModel.getUserImport({ user, importId });
  const {
    status, dailyLimit,
  } = importInfo;
  if (status !== IMPORT_STATUS.ACTIVE) return;

  const { result: post } = await PostImportModel.findOne({ filter: { importId } });
  if (!post) {
    await PostStatusModel.finishImport({ importId });
    const pending = await PostStatusModel.getPendingImport({ user });
    if (pending) importPost({ importId: pending.importId, user });
  }

  if (dailyLimit > 0) {
    const key = `${KEY_DAILY_LIMIT}:${user}:${importId}`;
    const { limitExceeded } = await checkAndIncrementDailyLimit({
      key,
      limit: dailyLimit,
    });
    if (limitExceeded) {
      const keyToContinue = `${IMPORT_REDIS_KEYS.CONTINUE_POST_IMPORT}:${user}:${importId}`;
      await setContinueTTlByAnotherKeyExpire({
        keyForTTL: key,
        keyToContinue,
      });
      return;
    }
  }
  const { body, title, tags } = post;

  const { result, error } = await publishPost({
    author: user, body, tags, title,
  });

  if (error) {
    console.log(`[ERROR][POST_IMPORT]${user} failed publish post ${error.message}`);
    await setContinueTtl({
      user, importId, type: IMPORT_TYPES.POST_IMPORT, ttl: CONTINUE_TTL_SEC,
    });
    return;
  }
  console.log(`[INFO][POST_IMPORT]${user} published post ${result}`);
  await PostImportModel.deleteOne({ filter: { _id: post._id } });
  await setContinueTtl({
    user, importId, type: IMPORT_TYPES.POST_IMPORT, ttl: CONTINUE_TTL_SEC,
  });
};

module.exports = importPost;
