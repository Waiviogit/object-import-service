const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');

const { Schema } = mongoose;

const DepartmentsStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  objectsCount: { type: Number, required: true },
  lists: { type: [String], default: [] },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  objectsClaimed: { type: Number, default: 0 },
  fieldsVoted: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

DepartmentsStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
DepartmentsStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
DepartmentsStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const DepartmentsStatusModel = db.model('departments_status', DepartmentsStatusSchema);

module.exports = DepartmentsStatusModel;
