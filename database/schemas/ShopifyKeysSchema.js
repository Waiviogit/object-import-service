const mongoose = require('mongoose');

const { Schema } = mongoose;

const EncryptedSchema = new Schema({
  encryptedData: { type: String, required: true },
  iv: { type: String, required: true },
}, { _id: false });

const ShopifyKeysSchema = new Schema({
  userName: { type: String, required: true },
  hostName: { type: String, required: true },
  apiKey: { type: String, required: true },
  storefrontToken: { type: String },
  accessToken: { type: EncryptedSchema, required: true },
  apiSecretKey: { type: EncryptedSchema, required: true },

}, { versionKey: false });

ShopifyKeysSchema.index({ userName: 1, hostName: 1 }, { unique: true });

module.exports = mongoose.model('shopify_keys', ShopifyKeysSchema);
