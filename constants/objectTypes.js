exports.IMPORT_OBJECT_TYPES = {
  BOOK: 'book',
  RESTAURANT: 'restaurant',
  PRODUCT: 'product',
};

exports.OBJECT_TYPES = {
  BOOK: 'book',
  BUSINESS: 'business',
  PERSON: 'person',
  RESTAURANT: 'restaurant',
  PRODUCT: 'product',
};

exports.DATAFINITY_IDS = 'keys';
exports.DATAFINITY_KEY = 'datafinityKey';

exports.OBJECT_IDS = {
  ASINS: 'asins',
  EAN13: 'ean13',
  EAN8: 'ean8',
  ISBN: 'isbn',
  UPCA: 'upca',
  UPCE: 'upce',
  VIN: 'vin',
};

exports.AUTHORITY_FIELD_OPTIONS = {
  ADMINISTRATIVE: 'administrative',
  OWNERSHIP: 'ownership',
};

exports.OBJECT_FIELDS = {
  PRODUCT_ID: 'productId',
  AUTHORITY: 'authority',
  NAME: 'name',
  AGE_RANGE: 'ageRange',
  OPTIONS: 'options',
  PUBLICATION_DATE: 'publicationDate',
  DIMENSIONS: 'dimensions',
  WEIGHT: 'productWeight',
  LANGUAGE: 'language',
  PRINT_LENGTH: 'printLength',
  AUTHORS: 'authors',
  PUBLISHER: 'publisher',
  AVATAR: 'avatar',
  MAP: 'map',
  ADDRESS: 'address',
  EMAIL: 'email',
  TAG_CATEGORY: 'tagCategory',
  CATEGORY_ITEM: 'categoryItem',
  WORK_TIME: 'workTime',
  WEBSITE: 'website',
  COMPANY_ID: 'companyId',
  MERCHANT: 'merchant',
  MANUFACTURER: 'manufacturer',
  BRAND: 'brand',
  FEATURES: 'features',
  DEPARTMENTS: 'departments',
  GALLERY_ALBUM: 'galleryAlbum',
  GALLERY_ITEM: 'galleryItem',
  PRICE: 'price',
  DESCRIPTION: 'description',
  GROUP_ID: 'groupId',
};

exports.FIELDS_BY_OBJECT_TYPE = {
  person: [
    this.OBJECT_FIELDS.NAME,
  ],
  restaurant: [
    this.OBJECT_FIELDS.NAME,
    this.OBJECT_FIELDS.ADDRESS,
    this.OBJECT_FIELDS.MAP,
    this.OBJECT_FIELDS.EMAIL,
    this.OBJECT_FIELDS.TAG_CATEGORY,
    this.OBJECT_FIELDS.WORK_TIME,
    this.OBJECT_FIELDS.WEBSITE,
    this.OBJECT_FIELDS.COMPANY_ID,
  ],
  book: [
    this.OBJECT_FIELDS.NAME,
    this.OBJECT_FIELDS.OPTIONS,
    this.OBJECT_FIELDS.PRODUCT_ID,
    this.OBJECT_FIELDS.AGE_RANGE,
    this.OBJECT_FIELDS.PUBLICATION_DATE,
    this.OBJECT_FIELDS.DIMENSIONS,
    this.OBJECT_FIELDS.LANGUAGE,
    this.OBJECT_FIELDS.PRINT_LENGTH,
    this.OBJECT_FIELDS.PUBLISHER,
    this.OBJECT_FIELDS.AVATAR,
    this.OBJECT_FIELDS.AUTHORS,
    this.OBJECT_FIELDS.DEPARTMENTS,
    this.OBJECT_FIELDS.WEIGHT,
    this.OBJECT_FIELDS.PRICE,
    this.OBJECT_FIELDS.DESCRIPTION,
    this.OBJECT_FIELDS.GROUP_ID,
  ],
  product: [
    this.OBJECT_FIELDS.NAME,
    this.OBJECT_FIELDS.PRODUCT_ID,
    this.OBJECT_FIELDS.AVATAR,
    this.OBJECT_FIELDS.DIMENSIONS,
    this.OBJECT_FIELDS.FEATURES,
    this.OBJECT_FIELDS.BRAND,
    this.OBJECT_FIELDS.MANUFACTURER,
    this.OBJECT_FIELDS.MERCHANT,
    this.OBJECT_FIELDS.WEIGHT,
    this.OBJECT_FIELDS.DEPARTMENTS,
    this.OBJECT_FIELDS.OPTIONS,
    this.OBJECT_FIELDS.PRICE,
    this.OBJECT_FIELDS.DESCRIPTION,
    this.OBJECT_FIELDS.GROUP_ID,
  ],
};

exports.FIELDS_FOR_TAGS = {
  TAG_CATEGORY: 'tagCategory',
  CATEGORY_ITEM: 'categoryItem',
};

exports.OBJECTS_FROM_FIELDS = {
  BUSINESS: 'business',
  PERSON: 'person',
};

exports.WEIGHT_UNITS = [
  't',
  'kg',
  'gm',
  'mg',
  'mcg',
  'st',
  'lb',
  'oz',
];

exports.DIMENSION_UNITS = [
  'km',
  'm',
  'cm',
  'mm',
  'μm',
  'mi',
  'yd',
  'ft',
  'in',
  'nmi',
];

exports.FIELD_LANGUAGES_TO_NLP = {
  'ru-RU': 'rus_Cyrl',
  'af-ZA': 'afr_Latn',
  'ar-SA': 'arb_Arab',
  'ca-ES': 'cat_Latn',
  'cs-CZ': 'ces_Latn',
  'da-DK': 'dan_Latn',
  'de-DE': 'deu_Latn',
  'es-ES': 'spa_Latn',
  'et-EE': 'est_Latn',
  'fil-PH': 'eng_Latn',
  'fr-FR': 'fra_Latn',
  'hi-IN': 'hin_Deva',
  'hr-HR': 'hrv_Latn',
  'hu-HU': 'hun_Latn',
  'id-ID': 'ind_Latn',
  'it-IT': 'ita_Latn',
  'ja-JP': 'jpn_Jpan',
  'ko-KR': 'kor_Hang',
  'ms-MY': 'zsm_Latn',
  'pl-PL': 'pol_Latn',
  'pt-BR': 'por_Latn',
  'uk-UA': 'ukr_Cyrl',
  'en-US': 'eng_Latn',
  'zh-CN': 'zho_Hans',
  default: 'eng_Latn',
};

exports.FEATURES_FILTER = [
  'Product Features',
  'Parent ASIN',
  'Best Sellers Rank',
  'Leaf Node Category',
  'Parent Node Category',
  'Parent Node Id',
  'Date First Available',
  'Leaf Node Id',
  'Hierarchy',
  'Color',
  'Item Dimensions LxWxH',
  'Packaged Quantity',
  'Style Name',
  'Body Color',
  'Key Points',
  '3G UMTS Band',
  'Product Type',
  'Additional Features',
  'Header / Brand',
  'Service Provider',
  'Root Node Id',
  'UNSPSC Code',
  'ManufacturerNumber',
  'Package Dimensions',
  'Newer model URL',
  'Department',
  'Date First Available',
  'ASIN ‏',
  'Title',
  'body html',
];

exports.FEATURES_KEYS = {
  PARENT_ASIN: 'Parent ASIN',
  ASIN_PLUS: 'ASIN ‏',
  PRODUCT_FEATURES: 'Product Features',
  AUTHORS: 'Author',
};

exports.PARENT_ASIN_FIELDS = [
  this.FEATURES_KEYS.PARENT_ASIN,
  this.FEATURES_KEYS.ASIN_PLUS,
];

exports.CURRENCY_PREFIX = {
  AUD: 'A$',
  USD: '$',
  CAD: 'C$',
  JPY: '¥',
  NZD: 'NZ$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  HKD: 'HK$',
  MXN: 'MX$',
  RUB: '₽',
  CNY: '¥',
  UAH: '₴',
  CHF: '₣',
  default: '$',
};
