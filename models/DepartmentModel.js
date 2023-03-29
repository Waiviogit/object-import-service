const { Department } = require('../database').models;

const find = async ({ filter, projection = {}, options = {} }) => {
  try {
    return { result: await Department.find(filter, projection, options).lean() };
  } catch (error) {
    return { error };
  }
};

const getTopLvlDepartments = async () => {
  const { result, error } = await find({
    filter: { level: 1 },
  });
  if (error) return [];
  return result.map((r) => r.name);
};

module.exports = {
  find,
  getTopLvlDepartments,
};
