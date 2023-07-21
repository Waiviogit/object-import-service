const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const AuthorityObjectSchema = new Schema({
  user: { type: String, required: true, index: true },
  importId: { type: String, required: true, index: true },
  authorPermlink: { type: String, required: true, index: true },
  claim: { type: Boolean, default: false },
}, { timestamps: false, versionKey: false });

const AuthorityObjectModel = db.model('authority_object', AuthorityObjectSchema);

module.exports = AuthorityObjectModel;
