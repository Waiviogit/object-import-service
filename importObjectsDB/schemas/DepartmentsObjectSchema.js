const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const DepartmentObjectSchema = new Schema({
  user: { type: String, required: true, index: true },
  importId: { type: String, required: true, index: true },
  authorPermlink: { type: String, required: true },
  department: { type: String, required: true },
  claim: { type: Boolean, default: false },
}, { timestamps: false, versionKey: false });

DepartmentObjectSchema.index({ importId: 1, authorPermlink: 1, claim: 1 });

const DepartmentObjectModel = db.model('department_object', DepartmentObjectSchema);

module.exports = DepartmentObjectModel;
