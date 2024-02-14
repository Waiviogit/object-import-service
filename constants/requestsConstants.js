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
  'https://api.primersion.com',
  'https://herpc.kanibot.com',
  'https://engine.deathwing.me',
  'https://he.sourov.dev',
];

exports.NODE_URLS = [
  'https://anyx.io',
  'https://hive-api.arcange.eu',
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
  },
  staging: {
    HOST: 'https://waiviodev.com',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    WOBJECT: '/wobject',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
  },
  development: {
    HOST: 'http://localhost:3000',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    WOBJECT: '/wobject',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
  },
};
