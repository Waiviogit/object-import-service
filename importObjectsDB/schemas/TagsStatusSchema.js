const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');

const { Schema } = mongoose;

const TagsStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  baseList: { type: String, required: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.ACTIVE,
  },
  locale: { type: String },
  objectsCount: { type: Number, required: true },
  objectsUpdated: { type: Number, default: 0 },
  numberOfTags: { type: Number, default: 0 },
  postedTags: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

TagsStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
TagsStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
TagsStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const TagsModel = db.model('tags_status', TagsStatusSchema);

module.exports = TagsModel;
