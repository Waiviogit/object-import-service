const redis = require('redis');
const config = require('../../../config');
const { startObjectImport } = require('../../services/importDatafinityObjects');
const { IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const claimProcess = require('../../services/authority/claimProcess');

const subscriber = redis.createClient({ db: config.redis.lastBlock });

subscriber.on('message', async (channel, message) => {
  try {
    const { user, author_permlink } = JSON.parse(message);

    await startObjectImport({
      user, authorPermlink: author_permlink,
    });
  } catch (error) {
    console.error(error.message);
  }
});
subscriber.subscribe('datafinityObject');

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
    default: break;
  }
};

module.exports = { subscriber, subscribeVoteRenew };
