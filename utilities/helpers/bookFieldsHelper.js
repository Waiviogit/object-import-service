const FormData = require('form-data');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const uuid = require('uuid');
const {
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  DATAFINITY_KEY,
  OBJECT_IDS,
  FIELDS_FOR_TAGS,
  FIELDS_BY_OBJECT_TYPE,
  OBJECT_FIELDS,
  OBJECT_TYPES,
  FEATURES_FILTER,
  CURRENCY_PREFIX,
  PARENT_ASIN_FIELDS,
  FEATURES_KEYS,
} = require('../../constants/objectTypes');
const { Wobj, DatafinityObject, ObjectType } = require('../../models');
const { formField } = require('./formFieldHelper');
const { getAuthorsData, getBookFormatData } = require('./amazonParseHelper');
const supposedUpdatesTranslate = require('../../translations/supposedUpdates');
const { translate } = require('./translateHelper');
const { genRandomString } = require('./permlinkGenerator');
const { IMAGE_SIZE } = require('../../constants/fileFormats');

exports.prepareFieldsForImport = async (object) => {
  const fields = [];
  const fieldsHandle = {
    ageRange,
    dimensions,
    language,
    publicationDate,
    productWeight,
    printLength,
    authors,
    publisher,
    options,
    productId,
    avatar,
    map,
    address,
    email,
    tagCategory,
    workTime,
    website,
    companyId,
    features,
    brand,
    manufacturer,
    merchant,
    departments,
    name,
    price,
    description,
    groupId,
  };

  const supposedUpdates = await addSupposedUpdates(object);
  if (!_.isEmpty(supposedUpdates)) fields.push(...supposedUpdates);

  if (object.authority) {
    fields.push(formField({
      fieldName: 'authority',
      body: object.authority,
      user: object.user,
      locale: object.locale,
    }));
  }
  const fieldTypes = FIELDS_BY_OBJECT_TYPE[object.object_type];

  for (const fieldsElementHandle of fieldTypes) {
    const field = await fieldsHandle[fieldsElementHandle](object);

    if (field && !field.length) {
      fields.push(field);
    } else if (field && field.length) {
      fields.push(...field);
    }
  }
  return fields;
};

const addSupposedUpdates = async (wobject) => {
  if (!_.get(wobject, 'object_type')) return;
  const fields = [];

  const { locale, user } = wobject;

  const { objectType, error: objTypeError } = await ObjectType.getOne({
    name: wobject.object_type,
  });
  if (objTypeError) return { error: objTypeError };

  const supposedUpdates = _.get(objectType, 'supposed_updates', []);
  if (_.isEmpty(supposedUpdates)) return;

  const identifier = genRandomString(8).toLowerCase();

  supposedUpdates.forEach((update) => {
    _.get(update, 'values', []).forEach((value) => {
      const body = supposedUpdatesTranslate[value][locale] || supposedUpdatesTranslate[value]['en-US'];
      const field = {
        name: update.name,
        body,
        permlink: `${identifier}-${update.name.toLowerCase()}-${genRandomString(5).toLowerCase()}`,
        creator: user,
        locale,
      };
      if (update.id_path) field[update.id_path] = uuid.v4();
      fields.push(field);
    });
  });
  return fields;
};

const groupId = (object) => {
  const parentAsin = _.find(_.get(object, 'features'),
    (f) => _.includes(PARENT_ASIN_FIELDS, f.key));
  if (!parentAsin) return;

  const body = _.get(parentAsin, 'value[0]', '').replace('‎ ', '');
  if (!body) return;

  return formField({
    fieldName: OBJECT_FIELDS.GROUP_ID,
    user: object.user,
    body,
    locale: object.locale,
  });
};

const price = (obj) => {
  if (!obj.mostRecentPriceAmount || !obj.mostRecentPriceCurrency) {
    const lastPrice = _.maxBy(_.get(obj, 'prices'), (p) => _.get(p, 'dateSeen[0]'));
    if (!lastPrice) return;

    const currencyPrefix = CURRENCY_PREFIX[lastPrice.currency] || CURRENCY_PREFIX.default;
    const body = `${currencyPrefix}${lastPrice.amountMax}`;

    return formField({
      fieldName: OBJECT_FIELDS.PRICE,
      user: obj.user,
      body,
      locale: obj.locale,
    });
  }

  const currencyPrefix = CURRENCY_PREFIX[obj.mostRecentPriceCurrency] || CURRENCY_PREFIX.default;

  const body = `${currencyPrefix}${obj.mostRecentPriceAmount}`;

  return formField({
    fieldName: OBJECT_FIELDS.PRICE,
    user: obj.user,
    body,
    locale: obj.locale,
  });
};

const description = (obj) => {
  if (!obj.descriptions || !Array.isArray(obj.descriptions)) {
    const features = _.find(obj.features, (f) => f.key === FEATURES_KEYS.PRODUCT_FEATURES);
    if (!features) return;
    let body = '';
    for (const featuresValue of features.value) {
      if (body.length + featuresValue.length < 5000) {
        body.length ? body += `. ${featuresValue}` : body += featuresValue;
      }
    }
    if (body) {
      return formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: obj.user,
        body,
        locale: obj.locale,
      });
    }
    return;
  }
  for (const element of obj.descriptions) {
    const content = _.get(element, 'value');
    if (!content) continue;
    if (content.length > 5000) continue;
    if (content.length < 30) continue;
    if (content.includes('<')) continue;

    return formField({
      fieldName: OBJECT_FIELDS.DESCRIPTION,
      user: obj.user,
      body: content,
      locale: obj.locale,
    });
  }
};

const ageRange = (obj) => {
  const age = obj.features.find((el) => el.key.toLowerCase()
    .replace(' ', '') === OBJECT_FIELDS.AGE_RANGE.toLowerCase());

  if (age) {
    return formField({
      fieldName: OBJECT_FIELDS.AGE_RANGE,
      user: obj.user,
      body: age.value.length ? age.value[0] : age.value,
      locale: obj.locale,
    });
  }
};

const dimensions = (obj) => {
  const dimension = _.get(obj, 'dimension');

  if (dimension) {
    const [value1, value2, value3] = dimension.split('x').map((el) => parseFloat(el));
    const length = Math.max(value1, value2, value3);
    const depth = Math.min(value1, value2, value3);
    const width = [value1, value2, value3].find((el) => el !== length && el !== depth);

    return formField({
      fieldName: OBJECT_FIELDS.DIMENSIONS,
      locale: obj.locale,
      body: JSON.stringify({
        length,
        depth,
        width,
        unit: DIMENSION_UNITS.find((el) => el.includes(dimension.split('x')[2].trim().split(' ')[1])) || 'in',
      }),
      user: obj.user,
    });
  }
};

const language = (obj) => {
  const lang = obj.features.find((el) => el.key.toLowerCase() === OBJECT_FIELDS.LANGUAGE);

  if (lang) {
    return formField({
      fieldName: OBJECT_FIELDS.LANGUAGE,
      body: lang.value.length ? lang.value[0] : lang.value,
      user: obj.user,
      locale: obj.locale,
    });
  }
};

const publicationDate = (obj) => {
  const date = obj.features.find((el) => el.key.toLowerCase()
    .replace(' ', '') === OBJECT_FIELDS.PUBLICATION_DATE.toLowerCase());

  if (date) {
    return formField({
      fieldName: OBJECT_FIELDS.PUBLICATION_DATE,
      body: date.value
        .reduce((prev, current) => (moment().unix(prev) > moment().unix(current) ? prev : current)),
      user: obj.user,
      locale: obj.locale,
    });
  }
};

const productWeight = (obj) => {
  const objWeight = _.get(obj, 'weight');

  if (objWeight) {
    const [value, unit] = objWeight.split(' ');
    let singUnit = 'lb';
    if (unit) {
      singUnit = !unit.endsWith('s') ? unit.trim() : unit.trim().slice(0, unit.length - 2);
    }

    return formField({
      fieldName: OBJECT_FIELDS.WEIGHT,
      body: JSON.stringify({
        value: parseFloat(value),
        unit: WEIGHT_UNITS.find((el) => el.includes(singUnit)) || 'lb',
      }),
      user: obj.user,
      locale: obj.locale,
    });
  }
};

const printLength = (obj) => {
  const printLen = obj.features.find((el) => el.key.toLowerCase().includes('pages'));

  if (printLen) {
    return formField({
      fieldName: OBJECT_FIELDS.PRINT_LENGTH,
      body: printLen.value[0].split(' ')[0],
      user: obj.user,
      locale: obj.locale,
    });
  }
};

const authors = async (obj) => {
  const fields = [];
  const merchant = 'amazon';
  if (!obj.prices) return;
  const priceDataWithUrl = obj.prices.find(
    (el) => _.includes(_.get(el, 'merchant'), merchant),
  );

  if (!priceDataWithUrl) {
    // todo
    return;
  }
  const url = _.find(_.get(priceDataWithUrl, 'sourceURLs'), (el) => el.includes(merchant));
  if (!url) {
    // todo
    return;
  }
  const authorsData = await getAuthorsData(url);

  for (const author of authorsData) {
    const connectedObject = !!author.asin;
    fields.push({
      ...formField({
        fieldName: OBJECT_FIELDS.AUTHORS,
        body: JSON.stringify({ name: author.name }),
        user: obj.user,
        locale: obj.locale,
      }),
      ...(connectedObject && { asin: author.asin, connectedObject }),
    });
  }

  return fields;
};

const publisher = async (obj) => {
  if (!obj.features || !Array.isArray(obj.features)) return;
  const objPublisher = _.find(obj.features, (f) => f.key.toLowerCase() === OBJECT_FIELDS.PUBLISHER);
  if (!objPublisher) return;
  const publisherName = _.get(objPublisher, 'value[0]');
  if (!publisherName) return;

  if (objPublisher) {
    return formField({
      fieldName: OBJECT_FIELDS.PUBLISHER,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({ name: publisherName }),
    });
  }
};

const getProductColor = (object) => {
  const objectName = object.name.toLocaleLowerCase();
  if (!_.isEmpty(object.colors)) {
    if (object.colors.length === 1) {
      return formField({
        fieldName: OBJECT_FIELDS.OPTIONS,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          category: 'color',
          value: object.colors[0],
          position: 1,
        }),
      });
    }
    for (const color of object.colors) {
      if (objectName.includes(color.toLocaleLowerCase())) {
        return formField({
          fieldName: OBJECT_FIELDS.OPTIONS,
          locale: object.locale,
          user: object.user,
          body: JSON.stringify({
            category: 'color',
            value: color,
            position: 1,
          }),
        });
      }
    }
    const fields = [];
    for (const [index, color] of object.colors.entries()) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.OPTIONS,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          category: 'color',
          value: color,
          position: index + 1,
        }),
      }));
    }
    return fields;
  }
};

const productOptions = (obj) => {
  const fields = [];
  const color = getProductColor(obj);
  if (color && !color.length) {
    fields.push(color);
  } else if (color && color.length) {
    fields.push(...color);
  }

  if (!_.isEmpty(obj.sizes)) {
    for (const [index, size] of obj.sizes.entries()) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.OPTIONS,
        locale: obj.locale,
        user: obj.user,
        body: JSON.stringify({
          category: 'size',
          value: size,
          position: index + 1,
        }),
      }));
    }
  }

  return fields;
};

const bookOptions = async (obj) => {
  const formats = obj.features.find((el) => el.key.toLowerCase().includes('format'));

  if (formats) {
    const uniqFormats = _.uniq(formats.value);
    const formatsDatafinity = formFormats(uniqFormats, obj);

    if (formatsDatafinity.length) {
      return formatsDatafinity;
    }
  }

  const merchant = 'amazon';
  const priceDataWithUrl = obj.prices.find((el) => el.merchant.includes(merchant));
  if (!priceDataWithUrl) {
    // todo
    return;
  }
  const url = priceDataWithUrl.sourceURLs.find((el) => el.includes(merchant));
  if (!url) {
    // todo
    return;
  }
  const scrapedFormats = await getBookFormatData(url);

  if (!scrapedFormats.length) {
    return;
  }

  const formatsAmazon = formFormats(scrapedFormats, obj);

  if (!formatsAmazon.length) {
    return;
  }

  return formatsAmazon;
};

const options = async (obj) => {
  const optionsHandler = {
    book: bookOptions,
    product: productOptions,
    default: () => {},
  };
  return (optionsHandler[obj.object_type] || optionsHandler.default)(obj);
};

const companyId = async (obj) => {
  if (_.isEmpty(obj.ids) && obj.id) {
    return formField({
      fieldName: OBJECT_FIELDS.COMPANY_ID,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        productId: obj.id,
        productIdType: DATAFINITY_KEY,
      }),
    });
  }
  if (!_.isEmpty(obj.ids)) {
    return formField({
      fieldName: OBJECT_FIELDS.COMPANY_ID,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        companyId: obj.ids[0],
        companyIdType: DATAFINITY_KEY,
      }),
    });
  }
};

const productId = (obj) => {
  const fields = [];
  const ids = Object.entries(obj)
    .filter((el) => Object.values(OBJECT_IDS).some((id) => el.includes(id)));

  for (const id of ids) {
    if (id[1].length) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.PRODUCT_ID,
        locale: obj.locale,
        user: obj.user,
        body: JSON.stringify({
          productId: id[1],
          productIdType: id[0],
        }),
      }));
    }
  }

  if (fields.length) {
    return fields;
  }

  if (obj.id) {
    return formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        productId: obj.id,
        productIdType: DATAFINITY_KEY,
      }),
    });
  }

  if (obj.keys) {
    return formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        productId: obj.keys[0],
        productIdType: DATAFINITY_KEY,
      }),
    });
  }
};

const checkImageHelper = async (image) => {
  try {
    const response = await axios.get(image);
    return response.status === 200;
  } catch (e) {
    return false;
  }
};

const loadImageByUrl = async (url, size) => {
  try {
    const bodyFormData = new FormData();

    bodyFormData.append('imageUrl', url);
    if (size) {
      bodyFormData.append('size', size);
    }
    const resp = await axios.post(
      process.env.SAVE_IMAGE_URL,
      bodyFormData,
      {
        headers: bodyFormData.getHeaders(),
      },
    );
    const result = _.get(resp, 'data.image');
    if (!result) return { error: new Error('Internal server error') };
    return { result };
  } catch (error) {
    return { error };
  }
};

const avatar = async (obj) => {
  const images = _.uniq(_.concat(obj.primaryImageURLs, obj.imageURLs));
  if (_.isEmpty(images)) return;
  const fields = [];
  let sliceStart = 1;

  for (const [index, image] of images.entries()) {
    const validImage = await checkImageHelper(image);
    if (!validImage) continue;
    const { result, error } = await loadImageByUrl(image, IMAGE_SIZE.CONTAIN);
    if (error) continue;

    fields.push(formField({
      fieldName: OBJECT_FIELDS.AVATAR,
      locale: obj.locale,
      user: obj.user,
      body: result,
    }));
    sliceStart = index + 1;
    break;
  }
  if (_.isEmpty(fields)) return;

  const imagesForGallery = _.slice(images, sliceStart);
  if (_.isEmpty(imagesForGallery)) return fields;

  for (const imagesForGalleryElement of imagesForGallery) {
    const validImage = await checkImageHelper(imagesForGalleryElement);
    if (!validImage) continue;
    const httpsStart = /^https:/.test(imagesForGalleryElement);
    if (!httpsStart) continue;

    let album = _.find(fields, (f) => f.name === OBJECT_FIELDS.GALLERY_ALBUM);
    if (!album) {
      album = formField({
        fieldName: OBJECT_FIELDS.GALLERY_ALBUM,
        body: 'Photos',
        user: obj.user,
        locale: obj.locale,
        id: uuid.v4(),
      });
      fields.push(album);
    }

    fields.push(formField({
      fieldName: OBJECT_FIELDS.GALLERY_ITEM,
      body: imagesForGalleryElement,
      user: obj.user,
      locale: obj.locale,
      id: album.id,
    }));
  }

  return fields;
};

const addTags = async (obj, tagCategoryId) => {
  const fields = [];

  for (const category of obj.categories) {
    const { wobject, error } = await Wobj.findOneByNameAndObjectType(category, 'hashtag');

    if (error || !wobject) {
      continue;
    }

    fields.push(formField({
      fieldName: FIELDS_FOR_TAGS.CATEGORY_ITEM,
      body: category,
      user: obj.user,
      locale: obj.locale,
      categoryItem: true,
      id: tagCategoryId,
    }));
  }

  return fields;
};

const formFormats = (uniqFormats, obj) => {
  const fields = [];

  for (let count = 0; count < uniqFormats.length; count++) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        category: 'format',
        value: uniqFormats[count],
        position: count,
      //  image: obj.imageURLs[count],
      }),
    }));
  }

  return fields;
};

exports.addTagsIfNeeded = async (datafinityObject, wobject) => {
  const tagCategory = wobject.fields
    .find((field) => field.name === FIELDS_FOR_TAGS.TAG_CATEGORY);
  const categoryItems = wobject.fields
    .filter((field) => field.name === FIELDS_FOR_TAGS.CATEGORY_ITEM && field.id === tagCategory.id);
  const categoryItemsToSave = datafinityObject.fields
    .filter((field) => field.name === FIELDS_FOR_TAGS.CATEGORY_ITEM);

  if (!categoryItems.length && !categoryItemsToSave.length) {
    const fields = await addTags(datafinityObject, tagCategory.id);

    if (fields.length) {
      await DatafinityObject.updateOne(
        { _id: datafinityObject._id },
        { $addToSet: { fields: { $each: fields } } },
      );
    }
  }
};

const tryGetMapFromName = async (object) => {
  try {
    const errorResp = { error: new Error('No data') };
    const accessKey = process.env.POSITIONSTACK_KEY;
    const query = `${_.get(object, 'address')}, ${_.get(object, 'city')}`;
    const resp = await axios.get(`http://api.positionstack.com/v1/forward?access_key=${accessKey}&query=${query}&country=${_.get(object, 'country')}`);
    const data = _.get(resp, 'data.data');
    if (_.isEmpty(data)) return errorResp;
    const address = _.find(data, (d) => d.name === _.get(object, 'address'));
    if (!address) return errorResp;
    if (!address.latitude || !address.longitude) return errorResp;

    return { map: _.pick(address, ['latitude', 'longitude']) };
  } catch (error) {
    return { error };
  }
};

const getMapFromOpenStreet = async (object) => {
  try {
    const errorResp = { error: new Error('No data') };
    const query = `${_.get(object, 'address')}, ${_.get(object, 'city')}, ${_.get(object, 'postalCode')}`;
    const resp = await axios.get(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
    const data = _.get(resp, 'data');
    if (_.isEmpty(data)) return errorResp;

    const latitude = parseFloat(_.get(data, '[0].lat'));
    const longitude = parseFloat(_.get(data, '[0].long'));
    if (!latitude || !longitude) return errorResp;

    return { map: { latitude, longitude } };
  } catch (error) {
    return { error };
  }
};

const map = async (object) => {
  if (object.longitude && object.latitude) {
    return formField({
      fieldName: OBJECT_FIELDS.MAP,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        latitude: object.latitude,
        longitude: object.longitude,
      }),
    });
  }

  const validAddress = checkAddress(object);
  if (!validAddress) return;

  const { map: positionstackMap, error } = await tryGetMapFromName(object);
  if (error) {
    const { map: openStreet, error: openStreetErr } = await getMapFromOpenStreet(object);
    if (openStreetErr) return;
    return formField({
      fieldName: OBJECT_FIELDS.MAP,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify(openStreet),
    });
  }

  return formField({
    fieldName: OBJECT_FIELDS.MAP,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify(positionstackMap),
  });
};

const address = async (object) => {
  const validAddress = checkAddress(object);
  if (!validAddress) return;

  return formField({
    fieldName: OBJECT_FIELDS.ADDRESS,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({
      address: _.get(object, 'address', ''),
      city: _.get(object, 'city', ''),
      state: _.get(object, 'province', ''),
      postalCode: _.get(object, 'postalCode', ''),
      country: _.get(object, 'country', ''),
    }),
  });
};

const checkAddress = (object) => /[0-9]/.test(_.get(object, 'address', ''));

const email = async (object) => {
  if (_.isEmpty(object.emails)) return;

  return formField({
    fieldName: OBJECT_FIELDS.EMAIL,
    locale: object.locale,
    user: object.user,
    body: object.emails[0],
  });
};

const tagCategory = async (object) => {
  if (!object.cuisines) return;
  const fields = [];
  if (object.locale === 'en-US') {
    for (const cuisine of object.cuisines) {
      const body = cuisine.toLocaleLowerCase();
      fields.push(formField({
        fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
        locale: object.locale,
        user: object.user,
        body,
        tagCategory: supposedUpdatesTranslate.Cuisine[object.locale],
      }));
    }
    return fields;
  }
  for (const cuisine of object.cuisines) {
    let body = cuisine.toLocaleLowerCase();
    if (object.translate) {
      const { error, result } = await translate({
        text: cuisine.toLocaleLowerCase(),
        source: 'en-US',
        target: object.locale,
      });
      if (error || !result) continue;
      body = result;
    }

    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body,
      tagCategory: supposedUpdatesTranslate.Cuisine[object.locale],
    }));
  }
  if (_.isEmpty(fields)) return;
  return fields;
};

const workTime = async (object) => {
  if (_.isEmpty(object.hours)) return;
  const body = _.reduce(object.hours, (acc, el) => `${acc}${el.day} ${el.hour}\n`, '');

  return formField({
    fieldName: OBJECT_FIELDS.WORK_TIME,
    locale: object.locale,
    user: object.user,
    body,
  });
};

const website = async (object) => {
  if (_.isEmpty(object.websites)) return;

  return formField({
    fieldName: OBJECT_FIELDS.WEBSITE,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ title: `${object.name} Website`, link: object.websites[0] }),
  });
};

const brand = (object) => {
  if (!object.brand) return;

  return formField({
    fieldName: OBJECT_FIELDS.BRAND,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.brand }),
  });
};

const manufacturer = (object) => {
  if (!object.manufacturer) return;

  return formField({
    fieldName: OBJECT_FIELDS.MANUFACTURER,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: object.manufacturer }),
  });
};

const merchant = (object) => {
  if (!object.merchants) return;

  const merchantDatafinitiy = _.find(object.merchants, (m) => !!m.name);
  if (!merchantDatafinitiy) return;

  return formField({
    fieldName: OBJECT_FIELDS.MERCHANT,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ name: merchantDatafinitiy.name }),
  });
};

const name = (object) => {
  if (!object.name) return;

  return formField({
    fieldName: OBJECT_FIELDS.NAME,
    locale: object.locale,
    user: object.user,
    body: object.name,
  });
};

const features = (object) => {
  const datafinityFeatures = _.filter(object.features, (f) => !_.includes(FEATURES_FILTER, f.key));
  if (_.isEmpty(datafinityFeatures)) return;
  const fields = [];
  for (const feature of datafinityFeatures) {
    if (feature.value.length > 1) continue;
    fields.push(formField({
      fieldName: OBJECT_FIELDS.FEATURES,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({ key: feature.key, value: feature.value[0] }),
    }));
  }

  return fields;
};

const departments = (object) => {
  const fields = [];
  if (!object.categories) return;

  let categories = _.take(_.uniq(object.categories), 10);
  if (object.object_type === OBJECT_TYPES.BOOK) {
    categories = _.filter(categories, (c) => c.toLowerCase() !== 'book');
    const booksCategory = _.find(categories, (c) => c.toLowerCase() === 'books');
    if (!booksCategory) {
      categories.pop();
      fields.push(formField({
        fieldName: OBJECT_FIELDS.DEPARTMENTS,
        locale: object.locale,
        user: object.user,
        body: 'Books',
      }));
    }
  }

  for (const category of categories) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.DEPARTMENTS,
      locale: object.locale,
      user: object.user,
      body: category.trim(),
    }));
  }
  return fields;
};
