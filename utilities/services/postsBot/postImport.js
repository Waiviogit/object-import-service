const {
  PostImportModel, PostStatusModel, UserModel,
} = require('../../../models');
const {
  validatePostingToRun,
  checkAndIncrementDailyLimit,
  setContinueTTlByAnotherKeyExpire,
  setContinueTtl,
} = require('../../../validators/accountValidator');
const { IMPORT_TYPES, IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { postWithOptions } = require('../../hiveApi/broadcastUtil');
const { createPostPermlink } = require('../../helpers/permlinkGenerator');
const { createGuestPost } = require('../../objectBotApi/guestPost');

const KEY_DAILY_LIMIT = 'dailyLimitPostsImport';
const CONTINUE_TTL_SEC = 60 * 5;

const publishPost = async ({
  author, body, title, tags, host,
}) => {
  const permlink = await createPostPermlink({ author, title });
  const isGuest = author.includes('_');

  const comment = {
    parent_author: '',
    parent_permlink: 'waivio',
    author,
    permlink,
    title,
    body,
    json_metadata: JSON.stringify({ tags, ...(host && { host }) }),
  };

  const beneficiaries = [
    {
      account: 'waivio',
      weight: 300,
    },
  ];

  // guest account
  if (isGuest) {
    const beneficiaryAcc = await UserModel.getGuestBeneficiaryAccount({ name: author });

    beneficiaries.push({
      account: beneficiaryAcc ?? 'waivio.hpower',
      weight: 9700,
    });
  }

  const options = {
    author,
    permlink,
    allow_votes: true,
    allow_curation_rewards: true,
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 0,
    extensions: [
      [
        0,
        { beneficiaries },
      ],
    ],
  };

  if (isGuest) {
    const { result, error } = await createGuestPost({ comment, options, userName: author });
    if (result) return { result: { author, permlink } };
    return { error: error || new Error('something went wrong') };
  }

  const { result, error } = await postWithOptions({
    comment,
    options,
    key: process.env.FIELD_VOTES_BOT_KEY,
  });

  if (result) return { result: { author, permlink } };
  return { error: error || new Error('something went wrong') };
};

const importPost = async ({ importId, user }) => {
  const validRc = await validatePostingToRun({
    user, importId, type: IMPORT_TYPES.POST_IMPORT,
  });
  if (!validRc) return;
  const importInfo = await PostStatusModel.getUserImport({ user, importId });
  const {
    status, dailyLimit, host,
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
    author: user, body, tags, title, host,
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
  await PostStatusModel.updateOne({
    filter: { importId },
    update: { $inc: { postsProcessed: 1 }, $addToSet: { posts: `${result.author}/${result.permlink}` } },
  });
  await setContinueTtl({
    user, importId, type: IMPORT_TYPES.POST_IMPORT, ttl: CONTINUE_TTL_SEC,
  });
};

module.exports = importPost;
