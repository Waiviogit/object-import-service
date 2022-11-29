const jsonDocFile = require('./swagger.json');
const config = require('../config');

jsonDocFile.host = config.swaggerHost;
module.exports = jsonDocFile;
