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

const IMPORT_GLOBAL_SETTINGS = {
  OBJECTS_MAX_QUEUE: 100,
  RC_TO_STOP: 7100,
  RC_TO_RESTORE: 7200,
};

const OBJECT_BOT_ROLE = {
  SERVICE_BOT: 'serviceBot',
};

const DEFAULT_VOTE_POWER_IMPORT = 3000;

const ONE_PERCENT_VOTE_RECOVERY = Math.round((60 * 60 * 24) / 20);

const notificationsApi = {
  production: {
    HOST: 'https://waiviodev.com',
    WS: 'wss://waiviodev.com',
    BASE_URL: '/notifications-api',
    SET_NOTIFICATION: '/set',
    STATUS: ['relisted', 'nsfw', 'unavailable'],
    WS_SET_NOTIFICATION: 'setNotification',
    WS_SET_SERVICE_NOTIFICATION: 'setServiceNotification',
  },
  development: {
    HOST: 'http://localhost:4000',
    WS: 'ws://localhost:4000',
    BASE_URL: '/notifications-api',
    SET_NOTIFICATION: '/set',
    STATUS: ['relisted', 'nsfw', 'unavailable'],
    WS_SET_NOTIFICATION: 'setNotification',
    WS_SET_SERVICE_NOTIFICATION: 'setServiceNotification',
  },
};

module.exports = {
  appData,
  uploadPath,
  uploadName,
  IMPORT_STATUS,
  IMPORT_REDIS_KEYS,
  ONE_PERCENT_VOTE_RECOVERY,
  DEFAULT_VOTE_POWER_IMPORT,
  IMPORT_GLOBAL_SETTINGS,
  OBJECT_BOT_ROLE,
  notificationsApi: notificationsApi[process.env.NODE_ENV || 'development'],
};
