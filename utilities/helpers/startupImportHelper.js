const _ = require('lodash');
const { ImportStatusModel } = require('../../models');
const { startObjectImport } = require('../services/importDatafinityObjects');

module.exports = async () => {
  const { result } = await ImportStatusModel.find({
    filter: { status: 'active' },
  });
  if (_.isEmpty(result)) return;

  for (const resultElement of result) {
    const { user, importId } = resultElement;
    await startObjectImport({ user, importId });
  }
};
