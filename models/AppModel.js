const { App } = require('../database').models;

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await App.findOne(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const getBotsByRoleAndHost = async ({ host = '', role = '' }) => {
  const { result, error } = await findOne({
    filter: { host },
    projection: { service_bots: 1 },
  });
  if (!result) return [];
  if (error) return [];
  const { service_bots = [] } = result;

  return service_bots
    .filter((b) => b.roles.includes(role)).map((b) => b.name);
};

module.exports = {
  getBotsByRoleAndHost,
};
