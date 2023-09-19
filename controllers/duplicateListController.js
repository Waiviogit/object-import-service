const createDuplicateTask = require('../utilities/services/listDuplication/createDuplicateTask');
const validators = require('./validators');
const { authorise } = require('../utilities/authorization/authorizeUser');
const { importAccountValidator } = require('../validators/accountValidator');
const { getVoteCostInitial } = require('../utilities/helpers/importDatafinityHelper');

const duplicateList = async (req, res, next) => {
  const value = validators.validate(
    req.body,
    validators.duplicateList.duplicateListSchema,
    next,
  );
  if (!value) return;

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);
  if (authError) return next(authError);
  const { result: validAcc, error: accError } = await importAccountValidator(
    value.user,
    getVoteCostInitial(value.user),
  );
  if (!validAcc) return next(accError);

  const { result, error } = await createDuplicateTask(value);

  if (error) return next(error);
  res.status(200).json(result);
};

module.exports = {
  duplicateList,
};
