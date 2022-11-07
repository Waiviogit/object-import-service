exports.OBJECT_TYPES = {
  BOOK: 'book',
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
};

exports.FIELDS_BY_OBJECT_TYPE = {
  book: [
    this.OBJECT_FIELDS.PRODUCT_ID,
    this.OBJECT_FIELDS.AGE_RANGE,
    this.OBJECT_FIELDS.OPTIONS,
    this.OBJECT_FIELDS.PUBLICATION_DATE,
    this.OBJECT_FIELDS.DIMENSIONS,
    this.OBJECT_FIELDS.LANGUAGE,
    this.OBJECT_FIELDS.PRINT_LENGTH,
    this.OBJECT_FIELDS.AUTHORS,
    this.OBJECT_FIELDS.PUBLISHER,
    this.OBJECT_FIELDS.AVATAR,
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
