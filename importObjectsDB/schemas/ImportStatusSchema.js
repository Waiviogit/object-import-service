const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');
const { AUTHORITY_FIELD_OPTIONS } = require('../../constants/objectTypes');

const { Schema } = mongoose;

const ImportStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  objectsCount: { type: Number, required: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  objectType: { type: String },
  authority: { type: String, enum: Object.values(AUTHORITY_FIELD_OPTIONS) },
  fieldsCount: { type: Number },
  fieldsCreatedCount: { type: Number },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

ImportStatusSchema.index({ user: 1, importId: 1 }, { unique: true });

const ImportStatusModel = db.model('import_status', ImportStatusSchema);

module.exports = ImportStatusModel;
