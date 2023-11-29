const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const DescriptionObjectSchema = new Schema({
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
      },
    ],
    default: [],
  },
}, { timestamps: false, versionKey: false });

DescriptionObjectSchema.index({ importId: 1, type: 1, processed: 1 });
DescriptionObjectSchema.index({
  importId: 1,
  type: 1,
  duplicateCreated: 1,
});
DescriptionObjectSchema.index({
  importId: 1,
  linkToDuplicate: 1,
});

const DescriptionObjectModel = db.model('description_object', DescriptionObjectSchema);

module.exports = DescriptionObjectModel;
