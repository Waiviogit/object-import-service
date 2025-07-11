const mongoose = require('mongoose');
const config = require('../config');
const importDb = require('../importObjectsDB/importObjects_Connection');

const URI = process.env.MONGO_URI_WAIVIO
  ? process.env.MONGO_URI_WAIVIO
  : `mongodb://${config.db.host}:${config.db.port}/${config.db.database}`;

mongoose.connect(URI)
  .then(() => console.log('MongoDB connection successful!'))
  .catch((error) => console.error(error));

mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
mongoose.connection.on('close', () => console.log(`closed ${config.db.database}`));

mongoose.Promise = global.Promise;

const closeMongoConnections = async () => {
  await mongoose.connection.close(false);
  await importDb.close(false);
};

module.exports = {
  Mongoose: mongoose,
  closeMongoConnections,
  models: {
    WObject: require('./schemas/wObjectSchema'),
    User: require('./schemas/UserSchema'),
    ObjectType: require('./schemas/ObjectTypeSchema'),
    Department: require('./schemas/DepartmentSchema'),
    GuestMana: require('./schemas/GuestManaSchema'),
    ServiceBot: require('./schemas/ServiceBotSchema'),
    App: require('./schemas/AppSchema'),
    ShopifyKeys: require('./schemas/ShopifyKeysSchema'),
  },
};
