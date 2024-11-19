const mongoose = require('mongoose');
const db = require('../importObjects_Connection');
const { IMPORT_STATUS } = require('../../constants/appData');

const { Schema } = mongoose;

const PostsStatusSchema = new Schema({
  user: { type: String, required: true },
  importId: { type: String, required: true, index: true },
  status: {
    type: String, required: true, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.PENDING,
  },
  host: { type: String },
  posts: { type: [String] },
  postsTotal: { type: Number, default: 0 },
  postsProcessed: { type: Number, default: 0 },
  dailyLimit: { type: Number, default: 0 },
  finishedAt: { type: Date },
}, { timestamps: true, versionKey: false });

PostsStatusSchema.index({ user: 1, importId: 1 }, { unique: true });
PostsStatusSchema.index({ user: 1, status: 1, finishedAt: -1 });
PostsStatusSchema.index({ user: 1, status: 1, createdAt: -1 });

const PostsStatusModel = db.model('posts_status', PostsStatusSchema);

module.exports = PostsStatusModel;
