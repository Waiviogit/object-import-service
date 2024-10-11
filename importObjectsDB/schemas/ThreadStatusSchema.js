const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');

const { Schema } = mongoose;

const ThreadStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.PENDING,
  },
  locale: { type: String },
  groupPermlink: { type: String, required: true },
  pagePermlink: { type: String, required: true },
  pageContent: { type: String, required: true },
  skip: { type: Number, default: 0 },
  limit: { type: Number, default: 0 },
  avoidRepetition: { type: Boolean, default: 0 },
  usersTotal: { type: Number, default: 0 },
  usersProcessed: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

ThreadStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
ThreadStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
ThreadStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const ThreadStatusModel = db.model('thread_status', ThreadStatusSchema);

module.exports = ThreadStatusModel;
