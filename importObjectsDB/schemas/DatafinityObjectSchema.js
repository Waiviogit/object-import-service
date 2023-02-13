const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const DatafinityObjectSchema = new Schema({
  user: { type: String, required: true, index: true },
  importId: { type: String, required: true, index: true },
  object_type: { type: String, required: true },
  author_permlink: String,
  startAuthorPermlink: { type: String },
  locale: { type: String },
  name: { type: String },
  translate: { type: Boolean },
  authority: String,
  groupIds: { type: [String] },
  fields: {
    type: [
      {
        weight: Number,
        locale: String,
        creator: String,
        permlink: String,
        name: String,
        body: String,
        id: String,
        asin: String,
        connectedObject: Boolean,
      },
    ],
    default: [],
  },
  datafinityObject: Boolean,
}, {
  timestamps: true,
  versionKey: false,
  toObject: {
    virtuals: true,
  },
});

const DatafinityObjectModel = db.model('datafinity_object', DatafinityObjectSchema);

module.exports = DatafinityObjectModel;
