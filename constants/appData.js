const appData = {
  appName: 'busy',
  version: '2.5.6',
  appAccName: 'monterey',
  appendObjectTag: 'waivio-object',
};

const uploadPath = 'uploads/';
const uploadName = 'wobjects.json';

const IMPORT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  ON_HOLD: 'onHold',
  FINISHED: 'finished',
  DELETED: 'deleted',
  WAITING_RECOVER: 'waitingRecover',
};

const IMPORT_REDIS_KEYS = {
  CONTINUE: 'continue',
  CONTINUE_AUTHORITY: 'continue_authority',
  CONTINUE_DEPARTMENTS: 'continue_departments',
  CONTINUE_DUPLICATE: 'continue_duplicate',
  CONTINUE_DESCRIPTION: 'continue_description',
  CONTINUE_TAGS: 'continue_tags',
  CONTINUE_THREADS: 'continue_threads',
  MIN_POWER: 'min_power',
  MIN_RC_THREADS: 'min_rc_threads',
  MIN_POWER_AUTHORITY: 'min_power_authority',
  MIN_POWER_DEPARTMENTS: 'min_power_departments',
  MIN_POWER_DUPLICATE: 'min_power_duplicate',
  MIN_POWER_DESCRIPTION: 'min_power_description',
  MIN_POWER_TAGS: 'min_power_tags',
  STOP_FOR_RECOVER: 'stop_for_recover',
  PENDING: 'pending',
};

const IMPORT_GLOBAL_SETTINGS = {
  OBJECTS_MAX_QUEUE: 100,
  RC_TO_STOP: 7500,
  RC_TO_RESTORE: 7510,
};

const OBJECT_BOT_ROLE = {
  SERVICE_BOT: 'serviceBot',
};

const AMAZON_ASINS = [
  'amazon.com',
  'amazon.ca',
  'amazon.com.mx',
  'amazon.com.br',
  'amazon.co.uk',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.de',
  'amazon.nl',
  'amazon.se',
  'amazon.pl',
  'amazon.in',
  'amazon.ae',
  'amazon.sa',
  'amazon.sg',
  'amazon.co.jp',
  'amazon.com.au',
  'asin',
  'asins',
  'isbn-10',
];

const DEFAULT_VOTE_POWER_IMPORT = 3000;
const MIN_RC_POSTING_DEFAULT = 7500;

const ONE_PERCENT_VOTE_RECOVERY = Math.round((60 * 60 * 24) / 20);

const notificationsApi = {
  production: {
    HOST: 'https://www.waivio.com',
    WS: 'wss://www.waivio.com',
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

const IMPORT_TYPES = {
  OBJECTS: 'objects',
  AUTHORITY: 'authority',
  DEPARTMENTS: 'departments',
  DUPLICATE: 'duplicate',
  DESCRIPTION: 'description',
  TAGS: 'tags',
  THREADS: 'threads',
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
  AMAZON_ASINS,
  IMPORT_TYPES,
  MIN_RC_POSTING_DEFAULT,
};
