const _ = require('lodash');
const { ImportStatusModel, AuthorityStatusModel, DepartmentsStatusModel } = require('../../models');
const { startObjectImport } = require('../services/importDatafinityObjects');
const { IMPORT_STATUS } = require('../../constants/appData');
const claimProcess = require('../services/authority/claimProcess');
const importDepartments = require('../services/departmentsService/importDepartments');

module.exports = async () => {
  const { result } = await ImportStatusModel.find({
    filter: { status: IMPORT_STATUS.ACTIVE },
  });

  const { result: authorityImports } = await AuthorityStatusModel.find({
    filter: { status: IMPORT_STATUS.ACTIVE },
  });

  const { result: departmentImports } = await DepartmentsStatusModel.find({
    filter: { status: IMPORT_STATUS.ACTIVE },
  });

  for (const resultElement of result) {
    const { user, importId } = resultElement;
    await startObjectImport({ user, importId });
  }

  for (const authorityImport of authorityImports) {
    const { user, importId } = authorityImport;
    claimProcess({ user, importId });
  }

  for (const departmentImport of departmentImports) {
    const { user, importId } = departmentImport;
    importDepartments({ user, importId });
  }
};
