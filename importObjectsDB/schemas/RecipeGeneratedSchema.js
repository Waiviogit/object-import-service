const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const productIdSchema = new Schema({
  key: { type: String },
  value: { type: String },
}, { _id: false });

const RecipeGeneratedSchema = new Schema({
  importId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
  hasSchema: { type: Boolean, default: false },
  errorCount: { type: Number, default: 0 },
  name: { type: String, required: true },
  fieldDescription: { type: String },
  categories: { type: [String] },
  fieldCalories: { type: String },
  fieldBudget: { type: String },
  fieldCookingTime: { type: String },
  fieldRecipeIngredients: { type: [String] },
  primaryImageURLs: { type: [String] },
  listAssociations: { type: [String] },
  waivio_product_ids: { type: [productIdSchema] },
  waivio_tags: { type: [productIdSchema] },
}, { timestamps: true, versionKey: false });

RecipeGeneratedSchema.index({ importId: 1, completed: 1, failed: 1 });
const RecipeGeneratedModel = db.model('recipe_generated', RecipeGeneratedSchema);

module.exports = RecipeGeneratedModel;
