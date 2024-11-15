const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const PostImportSchema = new Schema({
  importId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  tags: { type: [String], required: true },
}, { timestamps: false, versionKey: false });

const PostImportModel = db.model('posts_import', PostImportSchema);

module.exports = PostImportModel;
