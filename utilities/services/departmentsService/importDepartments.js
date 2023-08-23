const {
  Wobj, DepartmentsObjectModel, DepartmentsStatusModel,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_TYPES } = require('../../../constants/appData');
const { sendUpdateImportForUser } = require('../socketClient');
const { OBJECT_FIELDS } = require('../../../constants/objectTypes');
const { addField } = require('../importObjectsService');
const { formField } = require('../../helpers/formFieldHelper');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { validateSameFields } = require('../../helpers/importDatafinityHelper');

const incrObjectsCount = async ({
  user, importId, authorPermlink, department,
}) => {
  await DepartmentsObjectModel.updateToClaimedObject({
    user, importId, authorPermlink, department,
  });
  const { result } = await DepartmentsObjectModel.count({
    filter: { importId, authorPermlink, claim: false },
  });
  const objectsClaimed = result === 0 ? 1 : 0;
  await DepartmentsStatusModel.updateClaimedCount({
    user, importId, fieldsVoted: 1, objectsClaimed,
  });
};

const importDepartments = async ({ user, importId }) => {
  const importStatus = await DepartmentsStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({ user, importId, type: IMPORT_TYPES.DEPARTMENTS });
  if (!validImport) return;

  const nextObject = await DepartmentsObjectModel.getNextObject({ user, importId });
  if (!nextObject) {
    await DepartmentsStatusModel.finishImport({ user, importId });
    await sendUpdateImportForUser({ account: user });
    return;
  }

  const { department, authorPermlink } = nextObject;

  const { wobject, error } = await Wobj.getOne({ author_permlink: authorPermlink });
  if (error) {
    await incrObjectsCount({
      user, importId, authorPermlink, department,
    });
    importDepartments({ user, importId });
    return;
  }
  const fieldData = formField({
    fieldName: OBJECT_FIELDS.DEPARTMENTS,
    body: department,
    user,
  });

  const sameField = validateSameFields({ fieldData, wobject });

  if (!sameField) {
    await addField({
      field: fieldData,
      wobject,
      importingAccount: user,
      importId,
    });
  }

  await incrObjectsCount({
    user, importId, authorPermlink, department,
  });
  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  importDepartments({ user, importId });
};

module.exports = importDepartments;
