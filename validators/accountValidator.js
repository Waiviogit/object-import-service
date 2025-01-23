/* eslint-disable camelcase */
const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { checkVotePower, getMinAmountInWaiv } = require('../utilities/helpers/checkVotePower');
const { getAccount, getAccountRC } = require('../utilities/hiveApi/userUtil');
const { getVotingPowers } = require('../utilities/hiveEngine/hiveEngineOperations');
const {
  IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT, IMPORT_TYPES, ONE_PERCENT_VOTE_RECOVERY, MIN_RC_POSTING_DEFAULT,
} = require('../constants/appData');
const { redisGetter, redisSetter } = require('../utilities/redis');
const { getTokenBalances, getRewardPool } = require('../utilities/hiveEngineApi/tokensContract');
const { guestMana } = require('../utilities/guestUser');
const { getCurrentMana, MANA_CONSUMPTION } = require('../utilities/guestUser/guestMana');
const { checkWhiteList } = require('../utilities/helpers/whiteListHelper');
const { VOTE_COST } = require('../constants/voteAbility');

const POSTING_AUTHORITIES_ERROR = 'There is no data import authorization. Please go to the Data Import page and activate it.';

// approximate value to calc need rewrite python lib
const COMMENT_RC_COST = 3080000000;

const isGuestAccount = (account = '') => account.includes('_');

const guestImportAccountValidator = async (account) => {
  const abilityToVote = await guestMana.validateMana({ account });

  if (!abilityToVote) return { result: false, error: { status: '409', message: 'Not enough vote power' } };

  const manaRecord = await guestMana.getManaRecord(account);
  const postingAuthorities = manaRecord.importAuthorization;
  if (!postingAuthorities) {
    return { result: false, error: { status: '409', message: POSTING_AUTHORITIES_ERROR } };
  }

  return { result: true };
};

const importAccountValidator = async (user, voteCost) => {
  if (await checkWhiteList(user)) return { result: true };

  if (isGuestAccount(user)) return guestImportAccountValidator(user);

  console.log(user, 'checkVotePower');
  const { result: abilityToVote, error: engineError } = await checkVotePower(user, voteCost);
  if (engineError) {
    console.log(user, 'checkVotePower Error');
    return { result: false, error: { status: '409', message: engineError.message || 'Hive Engine facing problems. Please try again later.' } };
  }

  if (!abilityToVote) {
    console.log(user, 'Not enough vote power');
    return { result: false, error: { status: '409', message: 'Not enough vote power' } };
  }
  console.log(user, 'getAccount');
  const { account, error } = await getAccount(user);
  if (error) {
    console.log(user, 'getAccount Error');
    return { result: false, error };
  }

  const accountAuths = _.get(account, 'posting.account_auths', []);
  const postingAuthorities = accountAuths.find((el) => el[0] === process.env.FIELD_VOTES_BOT);

  if (!postingAuthorities) {
    return { result: false, error: { status: '409', message: POSTING_AUTHORITIES_ERROR } };
  }

  return { result: true };
};

const votePowerValidation = async ({ account, type }) => {
  const typeToKey = {
    [IMPORT_TYPES.OBJECTS]: `${IMPORT_REDIS_KEYS.MIN_POWER}:${account}`,
    [IMPORT_TYPES.AUTHORITY]: `${IMPORT_REDIS_KEYS.MIN_POWER_AUTHORITY}:${account}`,
    [IMPORT_TYPES.DEPARTMENTS]: `${IMPORT_REDIS_KEYS.MIN_POWER_DEPARTMENTS}:${account}`,
    [IMPORT_TYPES.DUPLICATE]: `${IMPORT_REDIS_KEYS.MIN_POWER_DUPLICATE}:${account}`,
    [IMPORT_TYPES.DESCRIPTION]: `${IMPORT_REDIS_KEYS.MIN_POWER_DESCRIPTION}:${account}`,
    [IMPORT_TYPES.TAGS]: `${IMPORT_REDIS_KEYS.MIN_POWER_TAGS}:${account}`,
    default: `${IMPORT_REDIS_KEYS.MIN_POWER}:${account}`,
  };

  const key = typeToKey[type] || typeToKey.default;
  let power = await redisGetter.get({ key });
  if (!power) power = DEFAULT_VOTE_POWER_IMPORT;

  const { votingPower } = await getVotingPowers({ account });

  return BigNumber(votingPower).gt(power);
};

const guestVotePowerValidation = async ({ account, type }) => {
  const typeToKey = {
    [IMPORT_TYPES.OBJECTS]: `${IMPORT_REDIS_KEYS.MIN_POWER}:${account}`,
    [IMPORT_TYPES.AUTHORITY]: `${IMPORT_REDIS_KEYS.MIN_POWER_AUTHORITY}:${account}`,
    [IMPORT_TYPES.DEPARTMENTS]: `${IMPORT_REDIS_KEYS.MIN_POWER_DEPARTMENTS}:${account}`,
    [IMPORT_TYPES.DUPLICATE]: `${IMPORT_REDIS_KEYS.MIN_POWER_DUPLICATE}:${account}`,
    [IMPORT_TYPES.DESCRIPTION]: `${IMPORT_REDIS_KEYS.MIN_POWER_DESCRIPTION}:${account}`,
    [IMPORT_TYPES.TAGS]: `${IMPORT_REDIS_KEYS.MIN_POWER_TAGS}:${account}`,
    default: `${IMPORT_REDIS_KEYS.MIN_POWER}:${account}`,
  };

  const key = typeToKey[type] || typeToKey.default;
  let power = await redisGetter.get({ key });
  if (!power) power = DEFAULT_VOTE_POWER_IMPORT;
  // we need this as max mana 1000
  const powerQuantifier = 10;

  const currentMana = await guestMana.getCurrentMana(account);

  const votingPower = powerQuantifier * currentMana;

  return BigNumber(votingPower).gt(power);
};

const validateRc = async ({ account, allowedRc = 1000 }) => {
  const { percentage, error } = await getAccountRC(account);
  if (error) return false;
  return percentage > allowedRc;
};

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

const setTtlToContinue = async ({
  user, importId, type, authorPermlink,
}) => {
  const typeToKey = {
    [IMPORT_TYPES.OBJECTS]: `${IMPORT_REDIS_KEYS.MIN_POWER}:${user}`,
    [IMPORT_TYPES.AUTHORITY]: `${IMPORT_REDIS_KEYS.MIN_POWER_AUTHORITY}:${user}`,
    [IMPORT_TYPES.DEPARTMENTS]: `${IMPORT_REDIS_KEYS.MIN_POWER_DEPARTMENTS}:${user}`,
    [IMPORT_TYPES.DUPLICATE]: `${IMPORT_REDIS_KEYS.MIN_POWER_DUPLICATE}:${user}`,
    [IMPORT_TYPES.DESCRIPTION]: `${IMPORT_REDIS_KEYS.MIN_POWER_DESCRIPTION}:${user}`,
    [IMPORT_TYPES.TAGS]: `${IMPORT_REDIS_KEYS.MIN_POWER_TAGS}:${user}`,
    default: `${IMPORT_REDIS_KEYS.MIN_POWER}:${user}`,
  };

  const keyPower = typeToKey[type] || typeToKey.default;
  const power = await redisGetter.get({ key: keyPower });
  const minVotingPower = power ? Number(power) : DEFAULT_VOTE_POWER_IMPORT;

  const { votingPower } = await getVotingPowers({ account: user });
  const ttl = await getTtlTime({
    votingPower,
    minVotingPower,
    account: user,
  });

  const typeToTTL = {
    [IMPORT_TYPES.OBJECTS]: `${IMPORT_REDIS_KEYS.CONTINUE}:${user}:${authorPermlink}:${importId}`,
    [IMPORT_TYPES.AUTHORITY]: `${IMPORT_REDIS_KEYS.CONTINUE_AUTHORITY}:${user}:${importId}`,
    [IMPORT_TYPES.DEPARTMENTS]: `${IMPORT_REDIS_KEYS.CONTINUE_DEPARTMENTS}:${user}:${importId}`,
    [IMPORT_TYPES.DUPLICATE]: `${IMPORT_REDIS_KEYS.CONTINUE_DUPLICATE}:${user}:${importId}`,
    [IMPORT_TYPES.DESCRIPTION]: `${IMPORT_REDIS_KEYS.CONTINUE_DESCRIPTION}:${user}:${importId}`,
    [IMPORT_TYPES.TAGS]: `${IMPORT_REDIS_KEYS.CONTINUE_TAGS}:${user}:${importId}`,
    default: `${IMPORT_REDIS_KEYS.CONTINUE}:${user}:${authorPermlink}:${importId}`,
  };

  const key = typeToTTL[type] || typeToTTL.default;
  await redisSetter.set({ key, value: '' });
  await redisSetter.expire({ key, ttl });
};

const validateGuestImportToRun = async ({
  user, type, importId, authorPermlink,
}) => {
  const validMana = await guestMana.validateMana({ account: user });
  const validPercent = await guestVotePowerValidation({ account: user, type });

  const manaRecord = await guestMana.getManaRecord(user);
  const authorizedImport = manaRecord.importAuthorization;
  if (!validMana || !validPercent || !authorizedImport) {
    await setTtlToContinue({
      user, importId, type, authorPermlink,
    });
    return;
  }
  return true;
};

const validateImportToRun = async ({
  user, importId, type, authorPermlink,
}) => {
  if (await checkWhiteList(user)) return true;

  if (isGuestAccount(user)) {
    return validateGuestImportToRun({
      user, importId, type, authorPermlink,
    });
  }

  const { result: validAcc } = await importAccountValidator(user, VOTE_COST.USUAL);
  const validVotePower = await votePowerValidation(
    { account: user, type },
  );
  const validRc = await validateRc({ account: user });

  if (!validVotePower || !validAcc || !validRc) {
    await setTtlToContinue({
      user, importId, type, authorPermlink,
    });
    return;
  }
  return true;
};

const getTtlPosting = (rc, minRc) => {
  const diff = (minRc - rc) || 1;
  const value = Math.round(ONE_PERCENT_VOTE_RECOVERY * (diff / 100));
  if (value > 0) return value;
  return 60 * 10;
};

const getValidRcComment = ({
  percentage, current_mana, max_mana, minRc,
}) => {
  const currentMana = current_mana > max_mana ? max_mana : current_mana;
  return percentage > minRc && currentMana > (COMMENT_RC_COST * 1.2);
};

const getAllowedRC = async ({ user, type }) => {
  const rcKeys = {
    [IMPORT_TYPES.THREADS]: IMPORT_REDIS_KEYS.MIN_RC_THREADS,
    [IMPORT_TYPES.POST_IMPORT]: IMPORT_REDIS_KEYS.MIN_RC_POST_IMPORT,
  };

  const rcKey = rcKeys[type];
  if (!rcKey) return MIN_RC_POSTING_DEFAULT;
  const key = `${rcKey}:${user}`;

  const allowedRC = await redisGetter.get({ key });
  return allowedRC || MIN_RC_POSTING_DEFAULT;
};

const savePostingTtl = async ({
  user, type, importId, percentage, minRc,
}) => {
  const typeToTTL = {
    [IMPORT_TYPES.THREADS]: `${IMPORT_REDIS_KEYS.CONTINUE_THREADS}:${user}:${importId}`,
    [IMPORT_TYPES.POST_IMPORT]: `${IMPORT_REDIS_KEYS.CONTINUE_POST_IMPORT}:${user}:${importId}`,
    default: `${IMPORT_REDIS_KEYS.CONTINUE_THREADS}:${user}:${importId}`,
  };
  const ttlKey = typeToTTL[type] || typeToTTL.default;
  const ttlSeconds = getTtlPosting(percentage, minRc);

  await redisSetter.setEx({ key: ttlKey, value: '', ttlSeconds });
};

const setContinueTtl = async ({
  user, importId, type, ttl,
}) => {
  const typeToTTL = {
    [IMPORT_TYPES.THREADS]: `${IMPORT_REDIS_KEYS.CONTINUE_THREADS}:${user}:${importId}`,
    [IMPORT_TYPES.POST_IMPORT]: `${IMPORT_REDIS_KEYS.CONTINUE_POST_IMPORT}:${user}:${importId}`,
    default: `${IMPORT_REDIS_KEYS.CONTINUE_THREADS}:${user}:${importId}`,
  };
  const ttlKey = typeToTTL[type] || typeToTTL.default;
  await redisSetter.set({ key: ttlKey, value: '' });
  await redisSetter.expire({ key: ttlKey, ttl });
};

const validateGuestPostingToRun = async ({ user, type, importId }) => {
  const minRc = await getAllowedRC({ user, type });

  const mana = await getCurrentMana(user); // mana max is 1000
  const adjustedMana = mana * 10;

  const consumptionTypes = {
    [IMPORT_TYPES.THREADS]: MANA_CONSUMPTION.COMMENT,
    [IMPORT_TYPES.POST_IMPORT]: MANA_CONSUMPTION.POST,
  };

  const requiredMana = consumptionTypes[type] || consumptionTypes[IMPORT_TYPES.POST_IMPORT];

  if (adjustedMana > minRc && mana > requiredMana) return true;

  await savePostingTtl({
    user, type, importId, percentage: adjustedMana, minRc,
  });

  return false;
};

const validatePostingToRun = async ({ user, type, importId }) => {
  if (user.includes('_')) return validateGuestPostingToRun({ user, type, importId });

  const minRc = await getAllowedRC({ user, type });
  const { percentage, current_mana, max_mana } = await getAccountRC(user);
  const validRc = getValidRcComment({
    percentage, current_mana, max_mana, minRc,
  });
  if (validRc) return true;

  await savePostingTtl({
    user, type, importId, percentage, minRc,
  });
  return false;
};

const checkAndIncrementDailyLimit = async ({ key, limit }) => {
  let count = await redisGetter.get({ key });

  if (!count) {
    await redisSetter.setEx({ key, value: 1, ttlSeconds: 86400 });
    return { currentCount: 1, limitExceeded: false };
  }

  count = parseInt(count, 10);

  if (count < limit) {
    // Increment the count
    const newCount = await redisSetter.incr({ key });
    return { currentCount: newCount, limitExceeded: false };
  }
  // Limit reached
  return { currentCount: count, limitExceeded: true };
};

const setContinueTTlByAnotherKeyExpire = async ({ keyForTTL, keyToContinue }) => {
  let ttlSeconds = await redisGetter.ttl({ key: keyForTTL });
  if (ttlSeconds <= 0) {
    ttlSeconds = 1;
  } // -1 constant -2 don't exist

  await redisSetter.setEx({ key: keyToContinue, value: '', ttlSeconds: ttlSeconds + 30 });
};

module.exports = {
  importAccountValidator,
  validateImportToRun,
  validatePostingToRun,
  checkAndIncrementDailyLimit,
  setContinueTTlByAnotherKeyExpire,
  setContinueTtl,
};
