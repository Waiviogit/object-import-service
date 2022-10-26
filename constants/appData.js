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
};

module.exports = {
  appData,
  uploadPath,
  uploadName,
  IMPORT_STATUS,
};
