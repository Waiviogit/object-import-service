const mongoose = require('mongoose');
const db = require('../importObjects_Connection');

const { Schema } = mongoose;

const TelegramImportUsageSchema = new Schema({
  telegramId: { type: Number, required: true },
  timesEntered: { type: Number, required: true },
  dateString: { type: String, required: true },
  type: { type: String, required: true },
}, { timestamps: false, versionKey: false });

TelegramImportUsageSchema.index({ telegramId: 1, timesEntered: 1, type: 1 }, { unique: true });

const TelegramImportUsageModel = db.model(
  'telegram_import_usage',
  TelegramImportUsageSchema,
  'telegram_import_usage',
);

module.exports = TelegramImportUsageModel;
