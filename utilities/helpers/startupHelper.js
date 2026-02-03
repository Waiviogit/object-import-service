const { importObjectsService } = require('../services');
const { subscribeObjectsExpired } = require('../redis/redis');
const { subscribeVoteRenew } = require('../redis/subscriber/subscriber');
const startupImportHelper = require('./startupImportHelper');

exports.init = async () => {
  subscribeObjectsExpired(subscribeVoteRenew);
  importObjectsService.runImportWobjectsQueue();
  importObjectsService.runImportAppendQueue();
  startupImportHelper();
};
