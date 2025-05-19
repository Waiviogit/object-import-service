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
      enum: ['AUD', 'USD', 'CAD', 'JPY', 'NZD', 'EUR', 'GBP', 'SGD', 'HKD', 'MXN', 'RUB', 'CNY', 'UAH', 'CHF'],
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

module.exports = {
  productSchema,
};
