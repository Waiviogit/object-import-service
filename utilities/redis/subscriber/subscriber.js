const redis = require('redis');
const config = require('../../../config');
const { startObjectImport } = require('../../services/objectsImport/importDatafinityObjects');
const { IMPORT_REDIS_KEYS, REDIS_CHANNEL, HOOK_ACTION } = require('../../../constants/appData');
const claimProcess = require('../../services/authority/claimProcess');
const importDepartments = require('../../services/departmentsService/importDepartments');
const duplicateProcess = require('../../services/listDuplication/duplicateProcess');
const rewriteDescription = require('../../services/descriptionBot/rewriteDescription');
const createTags = require('../../services/tagsBot/createTags');
const threadMessage = require('../../services/groupMessageThread/threadMessage');
const importPost = require('../../services/postsBot/postImport');
const { runShopifyObjectsImport } = require('../../services/shopify/shopifySyncTask');

const datafinityChannelHandler = async (message) => {
  try {
    const { user, author_permlink, importId } = JSON.parse(message);
    if (importId) {
      return duplicateProcess({ user, importId });
    }

    await startObjectImport({
      user, authorPermlink: author_permlink,
    });
  } catch (error) {
    console.error(error.message);
  }
};

const onFinishActions = {
  [HOOK_ACTION.SHOPIFY_SYNC]: runShopifyObjectsImport,
};

const finishImportHandler = async (message) => {
  try {
    const parsed = JSON.parse(message);
    const { method, args } = parsed;
    const handler = onFinishActions[method];
    if (!handler) return;
    handler(...args);
  } catch (error) {
    console.error(error.message);
  }
};

const channelHandlers = {
  [REDIS_CHANNEL.DATAFINITY_OBJECT]: datafinityChannelHandler,
  [REDIS_CHANNEL.FINISH_IMPORT_EVENT]: finishImportHandler,
};

const subscriber = redis.createClient({ db: config.redis.lastBlock });
subscriber.on('message', async (channel, message) => {
  const handler = channelHandlers[channel];
  if (!handler) return;
  await handler(message);
});
subscriber.subscribe([REDIS_CHANNEL.DATAFINITY_OBJECT, REDIS_CHANNEL.FINISH_IMPORT_EVENT]);

const subscribeVoteRenew = async (channel, message) => {
  const commands = message.split(':');
  switch (commands[0]) {
    case IMPORT_REDIS_KEYS.CONTINUE:
      const conditionAddPermlink = commands[2] !== 'undefined' && commands[2] !== 'null';
      const params = {
        user: commands[1],
        importId: commands[3],
        ...(conditionAddPermlink && { authorPermlink: commands[2] }),
      };
      await startObjectImport(params);
      break;
    case IMPORT_REDIS_KEYS.CONTINUE_AUTHORITY:
      claimProcess({
        user: commands[1],
        importId: commands[2],
      });
      break;
    case IMPORT_REDIS_KEYS.CONTINUE_DEPARTMENTS:
      importDepartments({
        user: commands[1],
        importId: commands[2],
      });
      break;

    case IMPORT_REDIS_KEYS.CONTINUE_DUPLICATE:
      duplicateProcess({
        user: commands[1],
        importId: commands[2],
      });
      break;

    case IMPORT_REDIS_KEYS.CONTINUE_DESCRIPTION:
      rewriteDescription({
        user: commands[1],
        importId: commands[2],
      });
      break;
    case IMPORT_REDIS_KEYS.CONTINUE_TAGS:
      createTags({
        user: commands[1],
        importId: commands[2],
      });
      break;
    case IMPORT_REDIS_KEYS.CONTINUE_THREADS:
      threadMessage({
        user: commands[1],
        importId: commands[2],
      });
      break;
    case IMPORT_REDIS_KEYS.CONTINUE_POST_IMPORT:
      importPost({
        user: commands[1],
        importId: commands[2],
      });
      break;
    default: break;
  }
};

module.exports = { subscriber, subscribeVoteRenew };
