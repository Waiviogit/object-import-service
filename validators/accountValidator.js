const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { checkVotePower } = require('../utilities/helpers/checkVotePower');
const { getAccount, getAccountRC } = require('../utilities/hiveApi/userUtil');
const { getVotingPowers } = require('../utilities/hiveEngine/hiveEngineOperations');
const { IMPORT_REDIS_KEYS, DEFAULT_VOTE_POWER_IMPORT } = require('../constants/appData');
const { redisGetter } = require('../utilities/redis');

const importAccountValidator = async (user, voteCost) => {
  const abilityToVote = await checkVotePower(user, voteCost);

  if (!abilityToVote) {
    return { result: false, error: { status: '409', message: 'Not enough vote power' } };
  }

  const { account, error } = await getAccount(user);
  if (error) return { result: false, error };

  const accountAuths = _.get(account, 'posting.account_auths', []);
  const postingAuthorities = accountAuths.find((el) => el[0] === process.env.FIELD_VOTES_BOT);

  if (!postingAuthorities) {
    return { result: false, error: { status: '409', message: 'Posting authorities not delegated' } };
  }

  return { result: true };
};

const votePowerValidation = async ({ account }) => {
  const key = `${IMPORT_REDIS_KEYS.MIN_POWER}:${account}`;
  let power = await redisGetter.get({ key });
  if (!power) power = DEFAULT_VOTE_POWER_IMPORT;

  const { votingPower } = await getVotingPowers({ account });

  return BigNumber(votingPower).gt(power);
};

const validateRc = async ({ account }) => {
  const { percentage, error } = await getAccountRC(account);
  if (error) return false;
  return percentage > 1000;
};

module.exports = {
  importAccountValidator,
  votePowerValidation,
  validateRc,
};
