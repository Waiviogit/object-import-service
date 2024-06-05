exports.VOTE_EVALUATION = {
  TOKEN_SYMBOL: 'WAIV',
  POOL_ID: 13,
  DIESEL_POOL_ID: 63,
  WEIGHT: 10000,
  REGENERATION_DAYS: 5,
};

exports.HIVE_ENGINE_NODES = [
  'https://engine.waivio.com',
  'https://herpc.dtools.dev',
  'https://api.hive-engine.com/rpc/',
  // 'https://api.primersion.com',
  'https://herpc.kanibot.com',
  'https://engine.deathwing.me',
  // 'https://he.sourov.dev',
];

exports.NODE_URLS = [
  'https://api.deathwing.me',
  'https://anyx.io',
  'https://api.hive.blog',
  'https://api.openhive.network',
];

exports.AMAZON_HOST = 'https://www.amazon.com';

exports.WAIVIO_API = {
  production: {
    HOST: 'https://www.waivio.com',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    WOBJECT: '/wobject',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
    AUTHORITY: '/authority',
    MAP: '/map',
    LIST: '/list',
  },
  staging: {
    HOST: 'https://waiviodev.com',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    WOBJECT: '/wobject',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
    AUTHORITY: '/authority',
    MAP: '/map',
    LIST: '/list',
  },
  development: {
    HOST: 'http://localhost:3000',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    WOBJECT: '/wobject',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
    AUTHORITY: '/authority',
    MAP: '/map',
    LIST: '/list',
  },
};
