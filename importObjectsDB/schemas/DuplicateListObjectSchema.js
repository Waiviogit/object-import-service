const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const DuplicateListObjectSchema = new Schema({
  user: { type: String, required: true, index: true },
  importId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true }, // list or object
  name: { type: String, required: true },
  linkToDuplicate: { type: String, required: true },
  authorPermlink: { type: String, default: '' },
  fieldsCreated: { type: Number, default: 0 },
  fieldsVoted: { type: Number, default: 0 },
  duplicateCreated: { type: Boolean, default: false },
  processed: { type: Boolean, default: false },
}, { timestamps: false, versionKey: false });

DuplicateListObjectSchema.index({ importId: 1, authorPermlink: 1, processed: 1 });
DuplicateListObjectSchema.index({
  importId: 1,
  type: 1,
  duplicateCreated: 1,
});

const DuplicateListObjectModel = db.model('duplicate_list_object', DuplicateListObjectSchema);

module.exports = DuplicateListObjectModel;
