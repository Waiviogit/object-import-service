const { addWhiteListToRedis } = require('../../helpers/whiteListHelper');

(async () => {
  await addWhiteListToRedis(process.argv[2]);
  process.exit();
})();
