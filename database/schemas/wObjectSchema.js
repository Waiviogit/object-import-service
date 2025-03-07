const mongoose = require('mongoose');

const { Schema } = mongoose;

const WObjectSchema = new Schema(
  {
    app: String,
    community: String,
    object_type: String,
    default_name: { type: String, required: true },
    is_posting_open: { type: Boolean, default: true },
    is_extending_open: { type: Boolean, default: true },
    creator: { type: String, required: true },
    author: { type: String, required: true },
    author_permlink: {
      type: String, index: true, unique: true, required: true,
    }, // unique identity for wobject, link to create object POST
    weight: { type: Number, index: true, default: 1 }, // value in STEEM(or WVIO) as a summ of rewards, index for quick sort
    parents: { type: [String], default: [] },
    children: { type: [String], default: [] },
    processed: { type: Boolean },
    fields: [{
      name: { type: String, index: true },
      body: { type: String, index: true },
      weight: { type: Number, default: 1 },
      locale: { type: String, default: 'en-US' },
      creator: { type: String },
      author: String, //
      permlink: String, // author+permlink is link to appendObject COMMENT(or to create object post if it's first field)
      id: String,
      active_votes: {
        type: [{
          voter: { type: String },
          weight: { type: Number },
        }],
        default: [],
      },
    }],
  },
  {
    strict: false,
    toObject: {
      virtuals: true,
    },
    timestamps: true,
  },
);

const wObjectModel = mongoose.model('wobject', WObjectSchema);

module.exports = wObjectModel;
