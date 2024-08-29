const crypto = require('node:crypto');
const { gptSystemUserPrompt, gptCreateImage } = require('../gptService');
const jsonHelper = require('../../helpers/jsonHelper');
const { RecipeGeneratedModel, RecipeGenerationStatusModel } = require('../../../models');
const { importObjects } = require('../importDatafinityObjects');

// todo on startup import resume
// todo delete object after import complete

const systemPrompt = `you are prompted to generate a recipe from the given name. 
The response format should be a json object according to the following scheme: 
{ 
    "name" : "string",
    "fieldDescription": "string",
    "categories": "string[]",
    "fieldCalories": "string",
    "fieldCookingTime": "string",
    "fieldRecipeIngredients": "string[]",
}

where: 
name - of recipe without changes
fieldDescription - description of recipe itself
for description follow these steps:
  - Write a short introduction.
  - Provide a list of ingredients.
  - Write detailed instructions on how to cook the recipe.

categories - list of categories to which this recipe can be assigned min 5 max 10 items
fieldCalories - total calories in recipe in calories
fieldCookingTime - total cooking time in minutes and hours
fieldRecipeIngredients - list of recipe ingredients
example:
{ 
    "name" : "Greek Beef Stuffed Onions (Salantourmasi)",
    "fieldDescription": "I was attempting to achieve a crispy, inside-out Parmesan omelet — and it worked! The caramelized cheese formed a thin but protective layer and, since the eggs had never directly touched the pan, they were moist and tender. This will also work whether you use one or three eggs, depending on the texture you're going for. Using a single egg is kind of a cool trick, since the cheese layer is almost as thick, and you can really appreciate the crispness even more. Crack eggs into a mixing bowl. Add 1/4 teaspoon water. Whisk together until just beaten (do not overmix). Drizzle olive oil into an 8-inch nonstick skillet. Brush evenly over the bottom of the pan. Evenly grate cheese into the skillet approximately 1/2-inch deep (or just shy of 1 ounce).Place pan over medium-high heat. Cheese will slowly start to melt. When cheese starts to bubble and turn golden brown, about 4 minutes, pour eggs evenly over cheese. Reduce heat to low. Sprinkle with salt, pepper, and cayenne. Cover and let eggs cook on low until they are set, checking after the first 30 seconds. For 2 eggs, this should take about 1 minute, total cooking time.Remove pan from heat. Carefully use a spatula to fold parmalet in half. Transfer to a serving plate.",
    "categories": ["Breakfast and Brunch", "Eggs", "Omelet Recipes"],
    "fieldCalories": "291 Calories",
    "fieldCookingTime": "15 mins",
    "fieldRecipeIngredients": ["2 eggs", "¼ teaspoon water", "1 teaspoon olive oil", "1 ounce freshly grated Parmigiano-Reggiano cheese, or a little less", "kosher salt and freshly ground black pepper to taste", "1 pinch cayenne pepper"],
}

return it like a string don't use code snippet symbols
`;
const imagePrompt = ({ name, recipeIngredients }) => `Create a high-resolution, photo-realistic cover image for a recipe, focusing on its name "${name}". The image should depict the main dish of the recipe in an appetizing and inviting way. Include key ingredients, such as ${recipeIngredients.join(',')}, arranged artistically around the dish to enhance the visual appeal. The background should resemble a rustic kitchen table, with soft, natural lighting and subtle shadows to create a warm and cozy atmosphere.`;

const generateRecipe = async (name) => {
  const { result, error } = await gptSystemUserPrompt({
    systemPrompt,
    userPrompt: name,
  });
  if (error) return null;
  return jsonHelper.parseJson(result, null);
};

const generateRecipeImage = async ({ name, recipeIngredients }) => {
  const prompt = imagePrompt({ name, recipeIngredients });

  const { result, error } = await gptCreateImage({
    prompt,
  });
  if (error) return '';

  const images = result.map((image) => image?.url);
  return images[0];
};

const updateErrorCount = async (recipeDoc) => {
  const failed = recipeDoc.errorCount > 3;
  await RecipeGeneratedModel.updateError(recipeDoc._id, failed);
};

const getProductId = () => ([{ key: 'instacart', value: crypto.randomUUID() }]);

const generateRecipeAndImage = async (importId) => {
  while (true) {
    let recipeDoc = await RecipeGeneratedModel.getNotProcessed(importId);
    if (!recipeDoc) break;

    // step1 generate schema
    if (!recipeDoc.hasSchema) {
      const recipe = await generateRecipe(recipeDoc.name);
      if (!recipe) {
        await updateErrorCount(recipeDoc);
        continue;
      }
      recipe.waivio_product_ids = getProductId();
      recipeDoc = await RecipeGeneratedModel.updateRecipeSchema(recipeDoc._id, recipe);
    }
    // step2 generate image
    const image = await generateRecipeImage({
      name: recipeDoc.name,
      description: recipeDoc.fieldDescription,
      recipeIngredients: recipeDoc.fieldRecipeIngredients,
    });
    if (!image) {
      await updateErrorCount(recipeDoc);
      continue;
    }
    await RecipeGeneratedModel.updateImage(recipeDoc._id, image);
  }

  const status = await RecipeGenerationStatusModel.getImportById(importId);
  const docsToImport = await RecipeGeneratedModel.getCompleted(importId);

  if (!status || !docsToImport?.length) {
    await RecipeGenerationStatusModel.setFinished(importId);
    return;
  }
  const { user, authority, locale } = status;

  // start Import
  await importObjects({
    user, authority, locale, jsonObjects: docsToImport,
  });

  await RecipeGenerationStatusModel.setFinished(importId);
};

const createObjectsForImport = async ({
  recipeList, user, authority, locale = 'en-US',
}) => {
  const importId = crypto.randomUUID();

  const { result } = await RecipeGenerationStatusModel.create({
    importId, user, locale, authority,
  });
  await RecipeGeneratedModel.insertMany(recipeList.map((el) => ({
    name: el, importId,
  })));
  generateRecipeAndImage(importId);

  return { result };
};

module.exports = {
  generateRecipeImage,
  generateRecipe,
  createObjectsForImport,
};
