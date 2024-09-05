const { IMPORT_STATUS } = require('../../constants/appData');
const { RecipeGenerationStatus } = require('../../importObjectsDB').models;

const create = async (doc) => {
  try {
    const result = await RecipeGenerationStatus.create(doc);
    return { result: result.toObject() };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await RecipeGenerationStatus.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateMany = async ({ filter, update, options }) => {
  try {
    const result = await RecipeGenerationStatus.updateMany(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await RecipeGenerationStatus.findOne(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await RecipeGenerationStatus.find(filter, projection, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await RecipeGenerationStatus.findOneAndUpdate(filter, update, options).lean();
    return { result };
  } catch (error) {
    return { error };
  }
};

const getUserImport = async ({ user, importId }) => {
  const { result, error } = await findOne({
    filter: { user, importId },
  });
  if (!result || error) return;
  return result;
};

const getImportById = async (importId) => {
  const { result, error } = await findOne({
    filter: { importId },
  });
  if (!result || error) return;
  return result;
};

const setFinished = async (importId) => updateOne({
  filter: { importId }, update: { status: IMPORT_STATUS.FINISHED },
});

const deleteById = async (importId) => {
  try {
    const result = await RecipeGenerationStatus.deleteOne({ importId });
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  create,
  updateOne,
  findOne,
  updateMany,
  find,
  findOneAndUpdate,
  getUserImport,
  getImportById,
  setFinished,
  deleteById,
};
