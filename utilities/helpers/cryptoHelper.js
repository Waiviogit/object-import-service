const crypto = require('node:crypto');

const createUUID = () => crypto.randomUUID();

module.exports = {
  createUUID,
};
