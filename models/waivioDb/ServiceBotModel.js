const { ServiceBot } = require('../../database').models;

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ServiceBot.find(filter, projection, options).lean();

    return { result };
  } catch (error) {
    return { error };
  }
};

const findByRole = async ({ role }) => {
  const { result = [] } = await find({ filter: { roles: role } });

  return result;
};

module.exports = {
  findByRole,
};
