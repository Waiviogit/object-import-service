const {
  Wobj, AuthorityStatusModel, AuthorityObjectModel,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT } = require('../../../constants/appData');
const { OBJECT_FIELDS, AUTHORITY_FIELD_OPTIONS } = require('../../../constants/objectTypes');
const { addField } = require('../importObjectsService');
const { formField } = require('../../helpers/formFieldHelper');
const { sendUpdateImportForUser } = require('../socketClient');
const { importAccountValidator, votePowerValidation, validateRc } = require('../../../validators/accountValidator');
const { getVoteCost } = require('../../helpers/importDatafinityHelper');
const { getVotingPowers } = require('../../hiveEngine/hiveEngineOperations');
const { redisSetter, redisGetter } = require('../../redis');
const { getTtlTime } = require('../../helpers/importDatafinityValidationHelper');

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

const setTtlToContinue = async ({ user, importId }) => {
  const keyPower = `${IMPORT_REDIS_KEYS.MIN_POWER_AUTHORITY}:${user}`;
  const power = await redisGetter.get({ key: keyPower });
  const minVotingPower = power ? Number(power) : DEFAULT_VOTE_POWER_IMPORT;

  const { votingPower } = await getVotingPowers({ account: user });
  const ttl = await getTtlTime({
    votingPower,
    minVotingPower,
    account: user,
  });

  const key = `${IMPORT_REDIS_KEYS.CONTINUE_AUTHORITY}:${user}:${importId}`;
  await redisSetter.set({ key, value: '' });
  await redisSetter.expire({ key, ttl });
};

const validateImportToRun = async ({ user, importId }) => {
  const { result: validAcc } = await importAccountValidator(user, getVoteCost(user));
  const validVotePower = await votePowerValidation(
    { account: user },
  );
  const validRc = await validateRc({ account: user });

  if (!validVotePower || !validAcc || !validRc) {
    await setTtlToContinue({ user, importId });
    return;
  }
  return true;
};

const claimProcess = async ({ user, importId }) => {
  const importStatus = await AuthorityStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({ user, importId });
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

  await addField({
    field: formField({
      fieldName: OBJECT_FIELDS.AUTHORITY,
      body: importStatus.authority,
      user,
    }),
    wobject,
    importingAccount: user,
    importId,
  });
  await incrObjectsCount({
    user, importId, authorPermlink: nextObject.authorPermlink,
  });
  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  claimProcess({ user, importId });
};

module.exports = claimProcess;
