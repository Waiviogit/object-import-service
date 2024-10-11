const { setTimeout } = require('node:timers/promises');
const { ThreadStatusModel, ThreadMessageModel } = require('../../../models');
const { broadcastComment } = require('../../hiveApi/broadcastUtil');
const { getAccountPosts } = require('../../hiveApi/postUtil');
const { createUUID } = require('../../helpers/cryptoHelper');
const { validatePostingToRun } = require('../../../validators/accountValidator');
const { IMPORT_TYPES, IMPORT_STATUS } = require('../../../constants/appData');

const THREADS_ACC = 'leothreads';

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
    json_metadata: JSON.stringify({ threadType: 'bulkMessage' }),
    key: process.env.IMPORT_BOT_KEY,
  });

  if (error) return { error };
  if (result) return { result };
};

const threadMessage = async ({ importId, user }) => {
  const validRc = await validatePostingToRun({
    user, importId, type: IMPORT_TYPES.THREADS,
  });
  if (!validRc) return;

  const importInfo = await ThreadStatusModel.getUserImport({ user, importId });
  const { pageContent, status } = importInfo;
  if (status !== IMPORT_STATUS.ACTIVE) return;

  const messageInfo = await ThreadMessageModel.findOneToProcess({ importId });
  if (!messageInfo) {
    await ThreadStatusModel.finishImport({ importId });
    const pending = await ThreadStatusModel.getPendingImport({ user });
    if (pending) threadMessage(pending);
    return;
  }

  const body = `${messageInfo.alias} (${messageInfo.recipient})\n\n${pageContent}`;

  const { result, error } = await sendThread({
    author: user,
    body,
  });
  if (result) console.log(`[INFO][THREADS]${user} send thread to ${messageInfo.recipient}`);

  if (error) {
    console.log(`[ERROR][THREADS]${user} failed send thread to ${messageInfo.recipient}`);
    await setTimeout(WAIT_TIME_MS);
    threadMessage({ importId, user });
    return;
  }

  await ThreadMessageModel.updateImportMessage(messageInfo);
  await setTimeout(WAIT_TIME_MS);
  threadMessage({ importId, user });
};

module.exports = threadMessage;
