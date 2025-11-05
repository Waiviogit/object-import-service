const _ = require('lodash');
const Joi = require('joi');
const {
  promptWithJsonSchema,
  editImageFromUrl,
  getImageFileFromUrl,
  gptImage1Generate,
} = require('../gptService');
const { RecipeGeneratedModel, RecipeGenerationStatusModel, ImportStatusModel } = require('../../../models');
const { saveObjects } = require('../objectsImport/importDatafinityObjects');
const { LANGUAGES_SET } = require('../../../constants/wobjectsData');
const { IMPORT_STATUS } = require('../../../constants/appData');
const { recipeSchema } = require('../../../constants/jsonShemaForAi');

const recipeSchemaObject = {
  name: 'recipe_schema',
  schema: recipeSchema,
};

const systemPrompt = (language) => `you are prompted to generate a recipe from the given name. 
The response format should be a json object according to the following scheme: 
{ 
    "name" : "string",
    "fieldDescription": "string",
    "categories": "string[]",
    "fieldCalories": "string",
    "fieldCookingTime": "string",
    "fieldBudget": "string",
    "fieldRecipeIngredients": "string[]",
    "fieldNutrition": "string",
}

where: 
name - name of recipe 
fieldDescription - make description of a recipe, don't write recipe itself
categories - provide a list of categories to which this recipe can be assigned, using a minimum of 5 and a maximum of 10 items, all in plural form.
fieldCalories - total calories in recipe in calories
fieldCookingTime - total cooking time in minutes and hours
fieldBudget - cost to prepare, $ under 10$ , $$ under 100$, $$$ under 1000$
fieldRecipeIngredients - list of recipe ingredients, each starts with corresponding emoji
fieldNutrition - Proteins, fats and carbohydrates per serving
example:
{ 
    "name" : "Greek Beef Stuffed Onions",
    "fieldDescription": "Greek Beef Stuffed Onions are a delightful Mediterranean dish that combines tender onions filled with a savory mixture of ground beef, herbs, and spices. To prepare, large onions are hollowed out, parboiled until soft, and then filled with a delicious stuffing made from ground beef, rice, garlic, fresh parsley, mint, cinnamon, and a hint of tomato. The stuffed onions are then baked in a rich tomato sauce until the beef is fully cooked and the flavors meld together beautifully. This dish is perfect as a main course or a hearty side, offering a unique and comforting taste of Greek cuisine. Serve hot, garnished with a sprinkle of fresh herbs and a drizzle of extra virgin olive oil for an authentic touch.",
    "categories": ["Breakfasts","Eggs", "Omelet Recipes"],
    "fieldCalories": "291 Calories",
    "fieldCookingTime": "15 mins",
    "fieldBudget": "$",
    "fieldRecipeIngredients": ["🥚 2 eggs", "💧 ¼ teaspoon water", "🫒 1 teaspoon olive oil", "🧀 1 ounce freshly grated Parmigiano-Reggiano cheese, or a little less", "🌶️ kosher salt and freshly ground black pepper to taste", "🌶️ 1 pinch cayenne pepper"],
    "fieldNutrition": "Proteins: 18g, Fats: 16g, Carbohydrates: 18g",
}
value of each field of an object should be in ${language} language
return it like a string don't use code snippet symbols 
`;

const getEditImagePrompt = (recipeName) => `edit a square photo of the dish (${recipeName}) on white background, make it look similar to given image, entire dish should be in the photo in an appropriate container/plate. no text, no words, no letters, no watermark`;

const imagePrompt = ({ name }) => `use your knowledge of the following dish and create a product photo of "${name}" In a dish appropriate for this food on a solid white background. no text, no words, no letters, no watermark`;

const generateRecipe = async (name, locale) => {
  const language = LANGUAGES_SET[locale] || LANGUAGES_SET['en-US'];

  const { result, error } = await promptWithJsonSchema({
    prompt: `${systemPrompt(language)} name: ${name}`,
    jsonSchema: recipeSchemaObject,
  });

  if (error) {
    console.log(`gptSystemUserPrompt Error: ${error.message}`);
    return null;
  }

  return result;
};

const generateRecipeImage = async ({ name }) => {
  const prompt = imagePrompt({ name });

  const { result, error } = await gptImage1Generate({
    prompt,
  });
  if (error) return '';

  return result;
};

const editImage = async ({ prompt, recipeUrl }) => {
  const { result: file, error: fileError } = await getImageFileFromUrl(recipeUrl);
  if (!file || fileError) {
    console.log(fileError?.message || 'Failed to fetch a file');
    return '';
  }

  const { result } = await editImageFromUrl({
    imageFile: file,
    prompt,
  });
  console.log('editImage RESULT', `${result}`);
  return result;
};

const updateErrorCount = async (recipeDoc) => {
  const failed = recipeDoc.errorCount > 3;
  await RecipeGeneratedModel.updateError(recipeDoc._id, failed);
};

const getProductId = (name = '') => ([{
  key: 'instacart',
  value: name.replace(/[.,%?+*|{}[\]()<>""^'"\\\-_=!&$:]/g, '')
    .replace(/ +/g, '-').trim().toLocaleLowerCase(),
}]);

const deleteRecipePreprocessedData = async (importId) => {
  await RecipeGenerationStatusModel.deleteById(importId);
  await RecipeGeneratedModel.deleteManyById(importId);
};

const recipeFields = ['fieldDescription', 'categories', 'fieldCalories', 'fieldCookingTime', 'fieldBudget', 'fieldRecipeIngredients', 'fieldNutrition'];

const formUpdateData = (importRecipe, generatedRecipe, locale) => {
  const updateData = {};
  for (const field of recipeFields) {
    if (_.isEmpty(importRecipe[field])) updateData[field] = generatedRecipe[field];
  }

  if (!importRecipe?.waivio_product_ids?.length) {
    updateData.waivio_product_ids = getProductId(importRecipe.name);
  }
  if (locale !== 'en-US') {
    updateData.name = generatedRecipe.name;
  }

  return updateData;
};

const generateRecipeAndImage = async ({ importId }) => {
  const status = await RecipeGenerationStatusModel.getImportById(importId);
  if (!status) return;
  const { locale } = status;

  while (true) {
    let recipeDoc = await RecipeGeneratedModel.getNotProcessed(importId);
    if (!recipeDoc) break;

    // step1 generate schema
    if (!recipeDoc.hasSchema) {
      const recipe = await generateRecipe(recipeDoc.name, locale);
      if (!recipe) {
        await updateErrorCount(recipeDoc);
        continue;
      }

      const updateData = formUpdateData(recipeDoc, recipe, locale);

      recipeDoc = await RecipeGeneratedModel
        .updateRecipeSchema(recipeDoc._id, updateData);
    }

    // step2 generate image

    if (recipeDoc?.primaryImageURLs?.length) {
      await RecipeGeneratedModel.updateImage(recipeDoc._id, recipeDoc.primaryImageURLs[0]);
      continue;
    }

    if (recipeDoc?.recipeUrl && recipeDoc.errorCount < 3) {
      const editedImage = await editImage({
        recipeUrl: recipeDoc?.recipeUrl,
        prompt: getEditImagePrompt(recipeDoc.name),
      });
      if (!editedImage) {
        await updateErrorCount(recipeDoc);
        continue;
      }

      await RecipeGeneratedModel.updateImage(recipeDoc._id, editedImage);
      continue;
    }
    console.log(`[Generate image] importId: ${importId}; errorCount: ${recipeDoc.errorCount || 0}; recipeUrl: ${recipeDoc?.recipeUrl || 'None'}`);
    const image = await generateRecipeImage({ name: recipeDoc.name });
    if (!image) {
      await updateErrorCount(recipeDoc);
      continue;
    }
    await RecipeGeneratedModel.updateImage(recipeDoc._id, image);
  }

  const docsToImport = await RecipeGeneratedModel.getCompleted(importId);

  if (!docsToImport?.length) {
    // finish import 0 objects
    await deleteRecipePreprocessedData(importId);
    await ImportStatusModel.updateOne({
      filter: { importId },
      update: { status: IMPORT_STATUS.FINISHED },
    });
    return;
  }

  const importStatus = await ImportStatusModel.findOneByImportId(importId);
  if (!importStatus || importStatus?.status !== IMPORT_STATUS.PENDING) {
    // user has deleted import
    await deleteRecipePreprocessedData(importId);
  }

  const {
    user, objectType, authority, translate, useGPT,
  } = importStatus;

  await saveObjects({
    objects: docsToImport,
    user,
    importStatus,
    authority,
    locale,
    translate,
    objectType,
    importId,
    useGPT,
  });
  await deleteRecipePreprocessedData(importId);
};

const createRecipeObjectsForImport = async ({
  objects, user, authority, locale = 'en-US', importId,
}) => {
  await RecipeGenerationStatusModel.create({
    importId, user, locale, authority,
  });
  await RecipeGeneratedModel.insertMany(objects.map((el) => ({ ...el, importId })));
  generateRecipeAndImage({ importId });
};

const recipeValidationSchema = Joi.object({
  name: Joi.string().min(1).required(),
  fieldDescription: Joi.string().min(1).required(),
  categories: Joi.array().items(Joi.string().min(1)).min(5).max(10)
    .required(),
  fieldCalories: Joi.string()
    .required(),
  fieldCookingTime: Joi.string().required(),
  fieldBudget: Joi.string().valid('$', '$$', '$$$').required(),
  fieldRecipeIngredients: Joi.array()
    .items(Joi.string())
    .min(1)
    .required(),
  fieldNutrition: Joi.string().required(),
});

const generateObjectByDescription = async ({ description = '' }) => {
  const prompt = `generate recipe json object from following text: ${description}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { result, error } = await promptWithJsonSchema({
      prompt,
      jsonSchema: recipeSchemaObject,
    });

    if (error) {
      continue;
    }

    const { error: validationError, value } = recipeValidationSchema
      .validate(result, { stripUnknown: true });

    if (!validationError) {
      return value;
    }
  }

  return null;
};

module.exports = {
  generateRecipeImage,
  generateRecipe,
  createRecipeObjectsForImport,
  generateRecipeAndImage,
  generateObjectByDescription,
};
