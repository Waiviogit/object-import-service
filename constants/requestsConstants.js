exports.VOTE_EVALUATION = {
  TOKEN_SYMBOL: 'WAIV',
  POOL_ID: 13,
  DIESEL_POOL_ID: 63,
  WEIGHT: 10000,
  REGENERATION_DAYS: 5,
};

exports.HIVE_ENGINE_NODES = [
  // 'https://api.hive-engine.com/rpc', // Germany
  // 'https://api2.hive-engine.com/rpc', // Finland
  'https://herpc.dtools.dev', // Miami
  'https://us.engine.rishipanthee.com', // Finland
  'https://ha.herpc.dtools.dev', // New Jersey
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
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
  },
  staging: {
    HOST: 'https://waiviodev.com',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
  },
  development: {
    HOST: 'http://localhost:3000',
    BASE_URL: '/api',
    WOBJECTS: '/wobjects',
    LIST_ITEM_LINKS: '/list-item-links',
    LIST_ITEM_DEPARTMENTS: '/list-item-departments',
  },
};
