const { RecipeGenerated } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await RecipeGenerated.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const count = async ({ filter, options }) => {
  try {
    const result = await RecipeGenerated.count(filter, options);

    return { count: result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await RecipeGenerated.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await RecipeGenerated.find(filter, projection, options).lean();

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await RecipeGenerated.updateOne(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await RecipeGenerated.findOneAndUpdate(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await RecipeGenerated.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await RecipeGenerated.countDocuments(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const getNotProcessed = async (importId) => {
  const { result } = await findOne({
    filter: { importId, completed: false, failed: false },
  });

  return result;
};

const updateError = async (_id, failed) => updateOne({
  filter: { _id },
  update: { $inc: { errorCount: 1 }, failed },
});

const updateRecipeSchema = async (_id, recipe) => {
  const { result } = await findOneAndUpdate({
    filter: { _id },
    update: { ...recipe, hasSchema: true },
    options: { new: true },
  });

  return result;
};

const updateImage = async (_id, image) => updateOne({
  filter: { _id },
  update: { completed: true, primaryImageURLs: [image] },
});

const getCompleted = async (importId) => {
  const { result } = await find({
    filter: { importId, completed: true },
    projection: {
      name: 1,
      fieldDescription: 1,
      categories: 1,
      fieldCalories: 1,
      fieldCookingTime: 1,
      fieldRecipeIngredients: 1,
      primaryImageURLs: 1,
      waivio_product_ids: 1,
    },
  });

  return result;
};

const deleteManyById = async (importId) => deleteMany({ filter: { importId } });

module.exports = {
  findOne,
  insertMany,
  count,
  updateOne,
  deleteMany,
  find,
  countDocuments,
  getNotProcessed,
  updateError,
  updateRecipeSchema,
  updateImage,
  getCompleted,
  deleteManyById,
};
