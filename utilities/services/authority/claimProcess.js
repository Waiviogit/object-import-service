const {
  Wobj, AuthorityStatusModel, AuthorityObjectModel,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_TYPES } = require('../../../constants/appData');
const { OBJECT_FIELDS, AUTHORITY_FIELD_OPTIONS } = require('../../../constants/objectTypes');
const { addField } = require('../importObjectsService');
const { formField } = require('../../helpers/formFieldHelper');
const { sendUpdateImportForUser } = require('../socketClient');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { validateSameFields } = require('../../helpers/importDatafinityHelper');

const getAuthorityField = ({ fields = [], user, authority }) => fields
  .find((el) => el.name === OBJECT_FIELDS.AUTHORITY
      && el.creator === user
      && el.body === authority);

const incrObjectsCount = async ({ user, importId, authorPermlink }) => {
  await AuthorityObjectModel.updateToClaimedObject({
    user, importId, authorPermlink,
  });
  await AuthorityStatusModel.updateClaimedCount({
    user, importId, fieldsVoted: 1, objectsClaimed: 1,
  });
};

const claimProcess = async ({ user, importId }) => {
  const importStatus = await AuthorityStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({ user, importId, type: IMPORT_TYPES.AUTHORITY });
  if (!validImport) return;

  const nextObject = await AuthorityObjectModel.getNextObject({ user, importId });
  if (!nextObject) {
    await AuthorityStatusModel.finishImport({ user, importId });
    await sendUpdateImportForUser({ account: user });
    return;
  }

  const { wobject, error } = await Wobj.getOne({ author_permlink: nextObject.authorPermlink });
  if (error) {
    await incrObjectsCount({
      user, importId, authorPermlink: nextObject.authorPermlink,
    });
    claimProcess({ user, importId });
    return;
  }
  const authority = getAuthorityField({
    fields: wobject?.fields ?? [], user, authority: importStatus.authority,
  });
  if (authority && importStatus.authority === AUTHORITY_FIELD_OPTIONS.ADMINISTRATIVE) {
    await incrObjectsCount({
      user, importId, authorPermlink: nextObject.authorPermlink,
    });
    claimProcess({ user, importId });
    return;
  }
  const fieldData = formField({
    fieldName: OBJECT_FIELDS.AUTHORITY,
    body: importStatus.authority,
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
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  await incrObjectsCount({
    user, importId, authorPermlink: nextObject.authorPermlink,
  });
  await sendUpdateImportForUser({ account: user });

  claimProcess({ user, importId });
};

module.exports = claimProcess;
