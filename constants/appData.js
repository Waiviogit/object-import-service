const appData = {
  appName: 'busy',
  version: '2.5.6',
  appAccName: 'monterey',
  appendObjectTag: 'waivio-object',
};

const uploadPath = 'uploads/';
const uploadName = 'wobjects.json';

const IMPORT_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'onHold',
  FINISHED: 'finished',
  DELETED: 'deleted',
  WAITING_RECOVER: 'waitingRecover',
};

const IMPORT_REDIS_KEYS = {
  CONTINUE: 'continue',
  MIN_POWER: 'min_power',
  STOP_FOR_RECOVER: 'stop_for_recover',
};

const DEFAULT_VOTE_POWER_IMPORT = 3000;

const ONE_PERCENT_VOTE_RECOVERY = (60 * 60 * 24) / 20;

module.exports = {
  appData,
  uploadPath,
  uploadName,
  IMPORT_STATUS,
  IMPORT_REDIS_KEYS,
  ONE_PERCENT_VOTE_RECOVERY,
  DEFAULT_VOTE_POWER_IMPORT,
};
