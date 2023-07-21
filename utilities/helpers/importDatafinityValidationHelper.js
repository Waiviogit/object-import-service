const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { importAccountValidator, votePowerValidation, validateRc } = require('../../validators/accountValidator');
const { getVoteCost } = require('./importDatafinityHelper');
const { ImportStatusModel } = require('../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS, ONE_PERCENT_VOTE_RECOVERY } = require('../../constants/appData');
const { getVotingPowers } = require('../hiveEngine/hiveEngineOperations');
const { redisSetter } = require('../redis');
const { getMinAmountInWaiv } = require('./checkVotePower');
const { getTokenBalances, getRewardPool } = require('../hiveEngineApi/tokensContract');

const getVotingPower = async ({ account, amount }) => {
  const tokenBalance = await getTokenBalances({ query: { symbol: 'WAIV', account }, method: 'findOne' });
  if (!tokenBalance) return 0;
  const { stake, delegationsIn } = tokenBalance;
  const pool = await getRewardPool({ query: { symbol: 'WAIV' }, method: 'findOne' });
  if (!pool) return 0;
  const { rewardPool, pendingClaims } = pool;
  const rewards = new BigNumber(rewardPool).dividedBy(pendingClaims);
  const finalRsharesCurator = new BigNumber(stake).plus(delegationsIn).div(2);

  const reverseRshares = new BigNumber(amount).dividedBy(rewards);

  return reverseRshares.times(100).div(finalRsharesCurator).times(100).toNumber();
};

const getTtlTime = async ({ votingPower, minVotingPower, account }) => {
  if (votingPower < minVotingPower) {
    const diff = (minVotingPower - votingPower) || 1;
    return Math.round(ONE_PERCENT_VOTE_RECOVERY * (diff / 100));
  }
  const amount = await getMinAmountInWaiv(account);
  const neededPower = await getVotingPower({ account, amount });
  if (neededPower < votingPower) return ONE_PERCENT_VOTE_RECOVERY;
  const diff = (neededPower - votingPower) || 1;
  return Math.round(ONE_PERCENT_VOTE_RECOVERY * (diff / 100));
};

const setTtlToContinue = async ({ user, authorPermlink, importId }) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const { votingPower } = await getVotingPowers({ account: user });
  const ttl = await getTtlTime({
    votingPower,
    minVotingPower: importDoc.minVotingPower,
    account: user,
  });

  const key = `${IMPORT_REDIS_KEYS.CONTINUE}:${user}:${authorPermlink}:${importId}`;
  await redisSetter.set({ key, value: '' });
  await redisSetter.expire({ key, ttl });
};

const checkImportActiveStatus = async (importId) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const status = _.get(importDoc, 'status');
  return status === IMPORT_STATUS.ACTIVE;
};

const validateImportToRun = async ({ datafinityObject, user, authorPermlink }) => {
  const activeStatus = await checkImportActiveStatus(datafinityObject.importId);
  if (!activeStatus) return;
  const { result: validAcc } = await importAccountValidator(user, getVoteCost(user));
  const validVotePower = await votePowerValidation(
    { account: user, importId: datafinityObject.importId },
  );
  const validRc = await validateRc({ account: user });

  if (!validVotePower || !validAcc || !validRc) {
    await setTtlToContinue({ user, authorPermlink, importId: datafinityObject.importId });
    return;
  }
  return true;
};

module.exports = {
  validateImportToRun,
  checkImportActiveStatus,
  getTtlTime,
};
