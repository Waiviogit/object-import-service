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
    galleryLength: {
      type: Type.Number,
      description: 'Count of images in gallery',
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
    compareAtPriceAmount: {
      type: Type.STRING,
      description: 'Initial price of the product before any sale/discount, the original price if the product is on sale on the site (e.g., "250")',
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

  required: ['name', 'waivio_options', 'fieldDescription', 'categories', 'galleryLength'],
};

const personSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'Person name e.g. Jimi Hendrix',
    },
    galleryLength: {
      type: Type.Number,
      description: 'Count of images in gallery',
    },
    fieldDescription: {
      type: Type.STRING,
      description: 'Person description or bio; empty string if not found',
    },
    address: {
      type: Type.STRING,
      description: 'Person address',
    },
    emails: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'Person contact email',
      },
    },
    workingHours: {
      type: Type.STRING,
      description: 'Person working hours',
    },
    websites: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'link to website',
      },
    },
    phone: {
      type: Type.STRING,
      description: 'Person contact phone',
    },
  },
  required: ['name', 'fieldDescription', 'galleryLength'],
};

const businessSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'Business name e.g. KFC',
    },
    galleryLength: {
      type: Type.Number,
      description: 'Count of images in gallery',
    },
    fieldDescription: {
      type: Type.STRING,
      description: 'Business description or bio; empty string if not found',
    },
    address: {
      type: Type.STRING,
      description: 'Business address',
    },
    emails: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'Business contact email',
      },
    },
    workingHours: {
      type: Type.STRING,
      description: 'Business working hours',
    },
    websites: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'link to website',
      },
    },
    phone: {
      type: Type.STRING,
      description: 'Business contact phone',
    },
  },
  required: ['name', 'fieldDescription', 'galleryLength'],
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

const productGallerySchema = {
  type: Type.OBJECT,
  required: ['avatar', 'gallery'],
  properties: {
    avatar: {
      type: 'string',
      description: 'The URL of the main image to use as the avatar (profile or main product image).',
    },
    gallery: {
      type: 'array',
      description: 'An array of image URLs suitable for use in a gallery (secondary or supporting product images).',
      items: {
        type: 'string',
        description: 'The URL of a gallery image.',
      },
    },
  },
};

const recipeTagsSchema = {
  type: Type.OBJECT,
  required: ['tags', 'cuisineTags'],
  properties: {
    tags: {
      type: 'array',
      description: `An array of tags add one from each category:
      COOKING METHOD (no combinations)
#air-fryer
#no-cook
#one-pot-one-pan
#Oven
#pressure-cooker
#slow-cooker
#stovetop

CALORIE RANGE (per serving)
#low-calorie (less than 400kcal)
#moderate-calorie – (400–650 kcal)
#high-calorie – (over 650 kcal)

MACRONUTRIENT FOCUS
#high-protein (≥30 g protein)
#Moderate-protein (15–29 g protein)
#low-protein (Less than 15 g of protein)
#low-fat (≤10 g fat)
#moderate-fat (between 10 and 30 g of fat)
#high-fat ( ≥30 g fat)
#high-carb – ≥50 g carbs
#moderate-Carb - between 20 and 50 g carbs
#low-carb – ≤20 g carbs
#keto (< 10 g Net carbs)

DIETARY PREFERENCE
#vegetarian – no meat, poultry, or fish
#vegan – no animal products (including dairy, eggs, honey)
#pescatarian – includes fish/seafood only
#gluten-free – no gluten ingredients
#dairy-free – no milk-derived ingredients
#nut-free – no tree nuts or peanuts
#soy-free – no soy ingredients
#paleo – no grains, dairy, legumes, or refined sugar
#high-fiber - ≥ 10 g dietary fiber per serving
#moderate-fiber - 5-9 g per serving.
#low-fiber - < 5 g per serving.
#seafood - contains any seafood
#spicy

PREP & COOK TIME
#under-30-minutes – total ≤30 min
#30–60-minutes – total between 30 and 60 min
#over-60-minutes – total >60 min
      `,

      items: {
        type: 'string',
      },
    },
    cuisineTags: {
      type: 'array',
      description: `An array of cuisine tags, add 3 items for geo, area, country:  
#african
#northafrican (#algerian, #egyptian, #libyan, #moroccan, #sudanese, #tunisian, #westernsaharan)
#hornofafrica (#djiboutian, #eritrean, #ethiopian, #somali)
#eastaafrican (#burundian, #comorian, #kenyan, #malagasy, #mauritian, #rwandan, #seychellois, #southsudanese, #tanzanian, #ugandan)
#centralafrican (#angolan, #cameroonian, #centralafrican, #chadian, #congolese, #drcongolese, #equatoguinean, #gabonese, #santomense)
#westafrican (#beninese, #burkinabe, #capeverdean, #ivorian, #gambian, #ghanaian, #guinean, #guineabissauan, #liberian, #malian, #mauritanian, #nigerien, #nigerian, #senegalese, #sierraleonean, #togolese)
#southernafrican (#botswanan, #eswatinian, #lesotho, #malawian, #mozambican, #namibian, #southafrican, #zambian, #zimbabwean)
#northamerican
#american (#classicamerican, #southern, #cajuncreole, #texmex, #midwesterncomfort, #pacificnorthwestern, #hawaiian)
#canadian
#greenlandic
#latinamerican
#caribbean (#antiguanbarbudan, #bahamian, #barbadian, #cuban, #dominican (dominica), #dominicanrepublic, #grenadian, #haitian, #jamaican, #kittitiannevisian, #saintlucian, #vincentian, #trinidadian, #puertorican, #guadeloupean, #martinican, #aruban, #curacaoan, #sintmaartener)
#latinmainland (#belizean, #costarican, #guatemalan, #honduran, #nicaraguan, #panamanian, #salvadoran, #mexican, #argentinian, #bolivian, #brazilian, #chilean, #colombian, #ecuadorian, #guyanese, #paraguayan, #peruvian, #surinamese, #uruguayan, #venezuelan, #frenchguianese)
#european
#westerneuropean (#austrian, #belgian, #french, #german, #irish, #liechtensteiner, #luxembourgish, #monegasque, #dutch, #swiss, #british)
#southerneuropean (#albanian, #andorran, #bosnian, #croatian, #greek, #italian, #maltese, #montenegrin, #northmacedonian, #portuguese, #sanmarinese, #serbian, #slovenian, #spanish, #kosovar, #vatican)
#easterneuropean (#belarusian, #bulgarian, #czech, #hungarian, #moldovan, #polish, #romanian, #russian, #slovak, #ukrainian)
#baltic (#estonian, #latvian, #lithuanian)
#nordic (#danish, #faroese, #finnish, #icelandic, #norwegian, #swedish)
#asian
#eastasian (#chinese, #japanese, #korean, #mongolian, #taiwanese, #macanese)
#southeastasian (#bruneian, #cambodian, #indonesian, #laotian, #malaysian, #myanma (or #burmese), #filipino, #singaporean, #thai, #vietnamese, #timorese)
#southasian (#afghan, #bangladeshi, #bhutanese, #indian, #maldivian, #nepali, #pakistani, #srilankan)
#centralasian (#kazakh, #kyrgyz, #tajik, #turkmen, #uzbek)
#middleeastern (#armenian, #azerbaijani, #bahraini, #cypriot, #georgian, #iranian (#persian), #iraqi, #israeli, #jordanian, #kuwaiti, #lebanese, #omani, #palestinian, #qatari, #saudi, #syrian, #turkish, #yemeni, #emirati)
#oceanian
#australasian (#australian, #newzealander)
#melanesian (#fijian, #papuanewguinean, #solomonislander, #ni-vanuatu, #newcaledonian)
#micronesian (#kiribatian, #marshallese, #micronesian, #nauruan, #palauan, #federatedstatesofmicronesia)
#polynesian (#samoan, #tongan, #tuvaluan, #cookislander, #niuean, #tokelauan, #frenchpolynesian, #tahitian, #american samoan)
#global (#fusion)
      `,

      items: {
        type: 'string',
      },
    },
  },
};

const recipeTagsSchemaObject = {
  name: 'recipe_tags_schema',
  schema: recipeTagsSchema,
};

module.exports = {
  productSchema,
  recipeSchema,
  productIdSchema,
  productGallerySchema,
  recipeTagsSchema,
  recipeTagsSchemaObject,
  personSchema,
  businessSchema,
};
