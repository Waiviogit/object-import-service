const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const ShopifySyncSchema = new Schema({
  userName: { type: String, required: true },
  hostName: { type: String, required: true },
  status: { type: String, default: 'pending' },
  authority: { type: String },
  locale: { type: String },
  sinceId: { type: Number, default: 0 },
}, { timestamps: false, versionKey: false });

ShopifySyncSchema.index({ userName: 1, hostName: 1 }, { unique: true });

module.exports = db.model('shopify_sync', ShopifySyncSchema, 'shopify_sync');
