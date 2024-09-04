const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const RecipeGeneratedSchema = new Schema({
  importId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
  hasSchema: { type: Boolean, default: false },
  errorCount: { type: Number, default: false },
  name: { type: String, required: true },
  fieldDescription: { type: String },
  categories: { type: [String] },
  fieldCalories: { type: String },
  fieldCookingTime: { type: String },
  fieldRecipeIngredients: { type: [String] },
  primaryImageURLs: { type: [String] },
  waivio_product_ids: {
    type: [{
      key: { type: String },
      value: { type: String },
    }],
  },
}, { timestamps: true, versionKey: false });

RecipeGeneratedSchema.index({ importId: 1, completed: 1, failed: 1 });
const RecipeGeneratedModel = db.model('recipe_generated', RecipeGeneratedSchema);

module.exports = RecipeGeneratedModel;