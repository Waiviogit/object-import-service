const { setTimeout } = require('node:timers/promises');
const { ThreadStatusModel, ThreadMessageModel } = require('../../../models');
const { broadcastComment } = require('../../hiveApi/broadcastUtil');
const { getAccountPosts } = require('../../hiveApi/postUtil');
const { createUUID } = require('../../helpers/cryptoHelper');
const { validatePostingToRun, checkAndIncrementDailyLimit, setContinueTTlByAnotherKeyExpire } = require('../../../validators/accountValidator');
const { IMPORT_TYPES, IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { sendUpdateImportForUser } = require('../socketClient');

const THREADS_ACC = 'leothreads';
const KEY_DAILY_LIMIT = 'dailyLimitImport';

const WAIT_TIME_MS = 5000;
const PERMLINK_MAX_LEN = 255;

const generateCommentPermlink = (postPermlink) => {
  const permlink = `re-${postPermlink}-${createUUID()}`;
  return permlink.length > PERMLINK_MAX_LEN
    ? permlink.substring(0, PERMLINK_MAX_LEN)
    : permlink;
};

const sendThread = async ({ author, body }) => {
  const { result: posts } = await getAccountPosts({
    account: THREADS_ACC,
    limit: 1,
  });
  if (!posts?.length) return { error: { message: 'NotFound' } };

  const [post] = posts;

  const { result, error } = await broadcastComment({
    author,
    permlink: generateCommentPermlink(post.permlink),
    body,
    parent_author: post.author,
    parent_permlink: post.permlink,
    title: '',
    json_metadata: JSON.stringify({ bulkMessage: true }),
    key: process.env.FIELD_VOTES_BOT_KEY,
  });

  if (error) return { error };
  if (result) return { result };
};

const updateImportItems = async ({ user, importId, recipient }) => {
  await ThreadStatusModel.updateUserProcessed({ importId });
  await ThreadMessageModel.updateImportMessage({ importId, recipient });
  await sendUpdateImportForUser({ account: user });
};

const threadMessage = async ({ importId, user }) => {
  const validRc = await validatePostingToRun({
    user, importId, type: IMPORT_TYPES.THREADS,
  });
  if (!validRc) return;

  const importInfo = await ThreadStatusModel.getUserImport({ user, importId });
  const {
    pageContent, status, avoidRepetition, dailyLimit,
  } = importInfo;
  if (status !== IMPORT_STATUS.ACTIVE) return;

  const messageInfo = await ThreadMessageModel.findOneToProcess({ importId });
  if (!messageInfo) {
    await ThreadStatusModel.finishImport({ importId });
    const pending = await ThreadStatusModel.getPendingImport({ user });
    if (pending) threadMessage({ importId, user });
    return;
  }

  const { recipient, alias, pagePermlink } = messageInfo;

  if (avoidRepetition) {
    const same = await ThreadMessageModel.findOneSame({ recipient, pagePermlink });
    if (same) {
      await updateImportItems({ user, importId, recipient });
      threadMessage({ importId, user });
      return;
    }
  }
  // check daily limit if limit exceed set ttl continue import
  if (dailyLimit > 0) {
    const key = `${KEY_DAILY_LIMIT}:${user}:${importId}`;
    const { limitExceeded } = await checkAndIncrementDailyLimit({
      key,
      limit: dailyLimit,
    });
    if (limitExceeded) {
      const keyToContinue = `${IMPORT_REDIS_KEYS.CONTINUE_THREADS}:${user}:${importId}`;
      await setContinueTTlByAnotherKeyExpire({
        keyForTTL: key,
        keyToContinue,
      });
      return;
    }
  }

  const body = alias
    ? `${alias} (@${recipient})\n\n${pageContent}`
    : `@${recipient}\n\n${pageContent}`;

  const { result, error } = await sendThread({
    author: user,
    body,
  });
  if (result) console.log(`[INFO][THREADS]${user} send thread to ${recipient}`);

  if (error) {
    console.log(`[ERROR][THREADS]${user} failed send thread to ${recipient}`);
    await setTimeout(WAIT_TIME_MS);
    threadMessage({ importId, user });
    return;
  }
  // here incr sent messages
  await updateImportItems({ user, importId, recipient });
  await setTimeout(WAIT_TIME_MS);
  threadMessage({ importId, user });
};

module.exports = threadMessage;
