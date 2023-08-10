const _ = require('lodash');

const { ImportStatusModel } = require('../../models');
const {
  IMPORT_STATUS,
} = require('../../constants/appData');

const checkImportActiveStatus = async (importId) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const status = _.get(importDoc, 'status');
  return status === IMPORT_STATUS.ACTIVE;
};

module.exports = {
  checkImportActiveStatus,
};
