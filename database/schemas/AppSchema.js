const mongoose = require('mongoose');

const { Schema } = mongoose;

const AdSense = new Schema({
  code: { type: String },
  level: { type: String },
  txtFile: { type: String },
}, { _id: false });

const topUsersSchema = new Schema({
  name: { type: String, required: true },
  weight: { type: Number, default: 0 },
}, { _id: false });

const TagsData = new Schema({
  Ingredients: { type: Object, default: {} },
  Cuisine: { type: Object, default: {} },
  'Good For': { type: Object, default: {} },
  Features: { type: Object, default: {} },
}, { _id: false });

const ReferralTimersSchema = new Schema({
  type: { type: String },
  duration: { type: Number, default: 90 },
}, { _id: false });

const botSchema = new Schema({
  name: { type: String, required: true },
  postingKey: { type: String, required: true },
  roles: { type: [String], required: true },
}, { _id: false });

const AppCommissions = new Schema({
  campaigns_server_acc: { type: String, required: true },
  campaigns_percent: {
    type: Number, min: 0, max: 1, required: true,
  },
  index_commission_acc: { type: String, required: true },
  index_percent: {
    type: Number, min: 0, max: 1, required: true,
  },
  referral_commission_acc: { type: String, required: true },
}, { _id: false });

const MapPoints = new Schema({
  topPoint: { type: [Number], required: true }, // First element - longitude(-180..180), second element - latitude(-90..90)
  bottomPoint: { type: [Number], required: true }, // First element - longitude(-180..180), second element - latitude(-90..90)
  center: { type: [Number], required: true }, // First element - longitude(-180..180), second element - latitude(-90..90)
  zoom: { type: Number, required: true },
}, { _id: false });

const AppHeader = new Schema({
  name: { type: String },
  message: { type: String },
  startup: { type: String },
}, { _id: false });

const CitySchema = new Schema({
  city: { type: String },
  route: { type: String },
}, { _id: false });

const ShopSettingsSchema = new Schema({
  type: { type: String },
  value: { type: String },
}, { _id: false });

const Configuration = new Schema({
  configurationFields: { type: [String] },
  desktopLogo: { type: String },
  mobileLogo: { type: String },
  mainBanner: { type: String },
  defaultListImage: { type: String },
  aboutObject: { type: String },
  desktopMap: { type: MapPoints },
  mobileMap: { type: MapPoints },
  availableCities: { type: [CitySchema], default: [] },
  shopSettings: { type: ShopSettingsSchema },
  colors: { type: Object, default: () => ({}) },
  header: { type: AppHeader },
  defaultHashtag: { type: String },
}, { _id: false });

const AppSchema = new Schema({
  name: { type: String, index: true },
  owner: { type: String, required: true, index: true },
  googleAnalyticsTag: { type: String, default: null },
  googleGSCTag: { type: String, default: null },
  googleEventSnippet: { type: String, default: null },
  googleAdsConfig: { type: String, default: null },
  beneficiary: {
    account: { type: String, default: 'waivio' },
    percent: { type: Number, default: 500 },
  },
  configuration: { type: Configuration, default: () => ({}) },
  host: {
    type: String, required: true, unique: true, index: true,
  },
  mainPage: { type: String },
  parent: { type: mongoose.Schema.ObjectId, default: null },
  admins: { type: [String], default: [] },
  authority: { type: [String], default: [] },
  moderators: { type: [String], default: [] },
  supported_object_types: { type: [String], default: [] },
  object_filters: { type: Object, default: {} },
  black_list_users: { type: [String], default: [] },
  blacklist_apps: { type: [String], default: [] },
  supported_hashtags: { type: [String], default: [] },
  canBeExtended: { type: Boolean, default: false },
  inherited: { type: Boolean, default: true },
  status: { type: String },
  activatedAt: { type: Date, default: null },
  deactivatedAt: { type: Date, default: null },
  supported_objects: { type: [String], index: true, default: [] },
  mapCoordinates: { type: [MapPoints], default: [] },
  top_users: { type: [topUsersSchema] },
  daily_chosen_post: {
    author: { type: String },
    permlink: { type: String },
    title: { type: String },
  },
  weekly_chosen_post: {
    author: { type: String },
    permlink: { type: String },
    title: { type: String },
  },
  service_bots: { type: [botSchema], default: [], select: false },
  app_commissions: { type: AppCommissions },
  referralsData: { type: [ReferralTimersSchema], default: [] },
  tagsData: { type: TagsData },
  currency: {
    type: String,
  },
  language: {
    type: String,
    default: 'en-US',
  },
  prefetches: { type: [String] },
  objectControl: { type: Boolean, default: false },
  useForCanonical: { type: Boolean, default: false },
  adSense: { type: AdSense, default: () => ({}) },
}, { timestamps: true });

const AppModel = mongoose.model('App', AppSchema);

module.exports = AppModel;
