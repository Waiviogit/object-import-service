const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');

const { Schema } = mongoose;

const DuplicateListStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  objectsCount: { type: Number, required: true },
  rootObject: { type: String, required: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  objectsClaimed: { type: Number, default: 0 },
  fieldsCreated: { type: Number, default: 0 },
  fieldsVoted: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

DuplicateListStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
DuplicateListStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
DuplicateListStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const DuplicateListStatusModel = db.model('duplicate_list_status', DuplicateListStatusSchema);

module.exports = DuplicateListStatusModel;
