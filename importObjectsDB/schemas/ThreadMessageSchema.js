const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const ThreadMessageSchema = new Schema({
  importId: { type: String, required: true },
  pagePermlink: { type: String, required: true },
  recipient: { type: String, required: true },
  alias: { type: String, default: '' },
  processed: { type: Boolean, default: false },
}, { timestamps: false, versionKey: false });

ThreadMessageSchema.index({ recipient: 1, pagePermlink: 1 });
ThreadMessageSchema.index({ importId: 1, processed: 1 });
ThreadMessageSchema.index({ recipient: 1, importId: 1 }, { unique: true });

const ThreadMessageModel = db.model('thread_message', ThreadMessageSchema);

module.exports = ThreadMessageModel;
