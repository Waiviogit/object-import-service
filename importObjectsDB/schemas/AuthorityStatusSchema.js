const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');
const { AUTHORITY_FIELD_OPTIONS } = require('../../constants/objectTypes');

const { Schema } = mongoose;

const AuthorityStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  objectsCount: { type: Number, required: true },
  lists: { type: [String], default: [] },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  authority: { type: String, enum: Object.values(AUTHORITY_FIELD_OPTIONS) },
  objectsClaimed: { type: Number, default: 0 },
  fieldsVoted: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

AuthorityStatusSchema.index({ user: 1, importId: 1 }, { unique: true });

const AuthorityStatusModel = db.model('authority_status', AuthorityStatusSchema);

module.exports = AuthorityStatusModel;
