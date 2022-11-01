const _ = require('lodash');
const { checkVotePower } = require('../utilities/helpers/checkVotePower');
const { getAccount } = require('../utilities/hiveApi/userUtil');
const { ImportStatusModel } = require('../models');
const { getVotingPowers } = require('../utilities/hiveEngine/hiveEngineOperations');

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

const votePowerValidation = async ({ account, importId }) => {
  const { result, error } = await ImportStatusModel.findOne({
    filter: { account, importId },
  });
  if (error) return false;
  if (!result) return false;
  const { votingPower } = await getVotingPowers({ account });
  return votingPower > result.minVotingPower;
};

module.exports = {
  importAccountValidator,
  votePowerValidation,
};
