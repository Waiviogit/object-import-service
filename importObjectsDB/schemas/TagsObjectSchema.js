const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const TagsObjectSchema = new Schema({
  user: { type: String, required: true, index: true },
  importId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true }, // list or object
  name: { type: String, required: true },
  authorPermlink: { type: String, default: '', required: true },
  processed: { type: Boolean, default: false },
  fieldsCreated: { type: Boolean, default: false },
  fields: {
    type: [
      {
        weight: Number,
        locale: String,
        creator: String,
        author: String,
        permlink: String,
        name: String,
        body: String,
        id: String,
        asin: String,
        connectedObject: Boolean,
        bookName: String,
        tagCategory: String,
      },
    ],
    default: [],
  },
}, { timestamps: false, versionKey: false });

TagsObjectSchema.index({ importId: 1, type: 1, processed: 1 });

const TagsObjectModel = db.model('tags_object', TagsObjectSchema);

module.exports = TagsObjectModel;
