exports.VOTE_EVALUATION = {
    TOKEN_SYMBOL: 'WAIV',
    POOL_ID: 13,
    DIESEL_POOL_ID: 63,
    WEIGHT: 10000
};

exports.HIVE_ENGINE_NODES = [
    'https://api.hive-engine.com/rpc', // Germany
    'https://api2.hive-engine.com/rpc', // Finland
    'https://herpc.dtools.dev', // Miami
    'https://us.engine.rishipanthee.com', // Finland
    'https://ha.herpc.dtools.dev' // New Jersey
];

const PRODUCTION_REQUEST_NODES = [
    'https://anyx.io',
    'https://hive-api.arcange.eu',
    'https://api.hive.blog',
    'https://api.openhive.network'
];

const STAGING_REQUEST_NODES = [
    'https://api.openhive.network',
    'https://rpc.esteem.app',
    'https://hive-api.arcange.eu',
    'https://rpc.ausbit.dev'
];

exports.NODE_URLS = process.env.NODE_ENV === 'production' ? PRODUCTION_REQUEST_NODES : STAGING_REQUEST_NODES;
