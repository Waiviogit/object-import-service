const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');
const { AUTHORITY_FIELD_OPTIONS } = require('../../constants/objectTypes');

const { Schema } = mongoose;

const RecipeGenerationStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  authority: { type: String, enum: Object.values(AUTHORITY_FIELD_OPTIONS) },
  locale: { type: String, default: 'en-US' },
}, { timestamps: true, versionKey: false });

RecipeGenerationStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
RecipeGenerationStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
RecipeGenerationStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const RecipeGenerationStatusModel = db.model('recipe_generation_status', RecipeGenerationStatusSchema);

module.exports = RecipeGenerationStatusModel;
