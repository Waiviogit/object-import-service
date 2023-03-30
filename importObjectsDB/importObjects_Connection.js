const mongoose = require('mongoose');
const config = require('../config');

const URI = `mongodb://${config.importDB.host}:${config.importDB.port}/${config.importDB.database}`;
const importDb = mongoose.createConnection(URI, {
  useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false,
},
() => console.log('ImportObjects DB connection successful!'));
importDb.on('close', () => console.log(`closed ${config.importDB.database}`));

module.exports = importDb;
