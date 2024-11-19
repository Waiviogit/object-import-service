const UserModel = require('../../database').models.User;

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await UserModel.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const getGuestBeneficiaryAccount = async ({ name }) => {
  const { result } = await findOne({ filter: { name }, projection: { user_metadata: 1 } });

  return result?.user_metadata?.settings?.hiveBeneficiaryAccount ?? '';
};

module.exports = {
  getGuestBeneficiaryAccount,
};
