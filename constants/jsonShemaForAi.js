const { CURRENCY_PREFIX } = require('./objectTypes');

const mostRecentPriceCurrencyEnum = Object.keys(CURRENCY_PREFIX).slice(0, -1);

const Type = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
};

const productSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'Product name (e.g., "iPhone 15 Pro Max")',
    },
    brand: {
      type: Type.STRING,
      description: 'Brand or manufacturer name (e.g., "Apple")',
    },
    dimension: {
      type: Type.STRING,
      description: 'Product dimensions (e.g., "10x5x2 cm")',
    },
    manufacturer: {
      type: Type.STRING,
      description: 'Manufacturer name (can be same as brand or more specific)',
    },
    mostRecentPriceAmount: {
      type: Type.STRING,
      description: 'Latest price as a string (e.g., "199.99")',
    },
    mostRecentPriceCurrency: {
      type: Type.STRING,
      enum: mostRecentPriceCurrencyEnum,
      description: 'Currency code for price (e.g., "USD", "EUR")',
    },
    weight: {
      type: Type.STRING,
      description: 'Product weight (e.g., "1.2 kg")',
    },
    merchants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Merchant or store name (e.g., "Amazon")',
          },
        },
        description: 'Merchant object',
      },
      description: 'Array of merchants selling the product',
    },
    fieldDescription: {
      type: Type.STRING,
      description: 'Product description; empty string if not found',
    },
    fieldRating: {
      type: Type.STRING,
      description: 'Product rating, min 0 max 5',
    },
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'Category string (e.g., "home", "kitchen")',
      },
      description: 'Array of category strings',
    },
    waivio_options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Option type (e.g., "Color", "Size")',
          },
          value: {
            type: Type.STRING,
            description: 'Option value (e.g., "Red", "XXL")',
          },
        },
        description: 'Options for product. Empty array if not found',
      },
      description: 'Array of product option objects. identify all product options that are visually highlighted or marked as "selected" (for example, by a checkmark, a border, a glow, a different background color, or any other visual cue that suggests selection).'
          + 'If no options in a category are selected, choose the first option (from left to right or top to bottom, as shown in the image) for that category.',
    },
    features: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: {
            type: Type.STRING,
            description: 'Feature name (e.g., "Material", "Overall Rating")',
          },
          value: {
            type: Type.STRING,
            description: 'Feature value (e.g., "Cotton", "4.5")',
          },
        },
        description: 'Feature object',
      },
      description: 'Array of product feature objects (e.g., { key: "Overall Rating", value: "4.5" })',
    },
  },

  required: ['name', 'waivio_options', 'fieldDescription', 'categories'],
};

const recipeSchema = {
  type: Type.OBJECT,
  required: ['name', 'fieldDescription', 'categories', 'fieldCalories', 'fieldCookingTime', 'fieldBudget', 'fieldRecipeIngredients', 'fieldNutrition'],
  properties: {
    name: {
      type: Type.STRING,
      minLength: 1,
      description: 'Name of the recipe',
    },
    fieldDescription: {
      type: Type.STRING,
      minLength: 1,
      description: 'Description of the recipe, not the recipe itself',
    },
    categories: {
      type: Type.ARRAY,
      minItems: 5,
      maxItems: 10,
      items: {
        type: Type.STRING,
        minLength: 1,
      },
      description: 'List of categories (5-10 items) in plural form',
    },
    fieldCalories: {
      type: Type.STRING,
      pattern: '^(?:Approx\\.\\s*)?\\d+\\s*(?:Calories|cal|kcal)?(?:\\s*per\\s*serving)?$',
      description: 'Total calories in recipe (e.g., "750", "Approx. 750 per serving", "750 Calories")',
    },
    fieldCookingTime: {
      type: Type.STRING,
      pattern: '^\\d+\\s*(mins|hours|min|hour)$',
      description: 'Total cooking time in minutes or hours',
    },
    fieldBudget: {
      type: Type.STRING,
      enum: ['$', '$$', '$$$'],
      description: 'Cost to prepare: $ under 10$, $$ under 100$, $$$ under 1000$',
    },
    fieldRecipeIngredients: {
      type: Type.ARRAY,
      minItems: 1,
      items: {
        type: Type.STRING,
        pattern: '^[^\\s]\\s.+$',
      },
      description: 'List of recipe ingredients, each starting with an emoji',
    },
    fieldNutrition: {
      type: Type.STRING,
      pattern: '^Proteins:\\s*\\d+g,\\s*Fats:\\s*\\d+g,\\s*Carbohydrates:\\s*\\d+g$',
      description: 'Proteins, fats and carbohydrates per serving',
    },
  },
};

const productIdSchema = {
  type: Type.OBJECT,
  required: ['id'],
  properties: {
    id: {
      type: Type.STRING,
      description: 'The unique product identifier extracted from a product URL. This ID should allow you to reconstruct the shortest possible URL that still directly opens the corresponding product page.',
    },
  },
};

module.exports = {
  productSchema,
  recipeSchema,
  productIdSchema,
};
