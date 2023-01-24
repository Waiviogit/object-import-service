const _ = require('lodash');
const { WHITE_LIST, VOTE_COST } = require('../../constants/voteAbility');

exports.getVoteCost = (account) => {
  if (_.includes(WHITE_LIST, account)) return VOTE_COST.FOR_WHITE_LIST;
  return VOTE_COST.USUAL;
};
