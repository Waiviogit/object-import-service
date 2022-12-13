const FormData = require('form-data');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const {
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  DATAFINITY_KEY,
  OBJECT_IDS,
  FIELDS_FOR_TAGS,
  FIELDS_BY_OBJECT_TYPE,
  OBJECT_FIELDS,
  OBJECT_TYPES,
} = require('../../constants/objectTypes');
const { Wobj, DatafinityObject } = require('../../models');
const { formField } = require('./formFieldHelper');
const { getAuthorsData, getBookFormatData } = require('./amazonParseHelper');
const supposedUpdatesTranslate = require('../../translations/supposedUpdates');
const { translate } = require('./translateHelper');

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
  };

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
      body: date.value.reduce((prev, current) => (moment().unix(prev) > moment().unix(current) ? prev : current)),
      user: obj.user,
      locale: obj.locale,
    });
  }
};

const productWeight = (obj) => {
  const objWeight = _.get(obj, OBJECT_FIELDS.WEIGHT);

  if (objWeight) {
    const [value, unit] = objWeight.split(' ');
    const singUnit = !unit.endsWith('s') ? unit.trim() : unit.trim().slice(0, unit.length - 2);

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
  const objPublisher = _.get(obj, 'brand');

  if (objPublisher) {
    return formField({
      fieldName: OBJECT_FIELDS.PUBLISHER,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({ name: objPublisher }),
    });
  }
};

const options = async (obj) => {
  // Todo object type switcher + filter instead find
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

const companyId = async (obj) => {
  const fields = [];

  if (obj.object_type === OBJECT_TYPES.RESTAURANT) {
    if (_.isEmpty(obj.ids)) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.COMPANY_ID,
        locale: obj.locale,
        user: obj.user,
        body: JSON.stringify({
          companyId: obj.id,
          companyIdType: DATAFINITY_KEY,
        }),
      }));
      return fields;
    }
    for (const id of obj.ids) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.COMPANY_ID,
        locale: obj.locale,
        user: obj.user,
        body: JSON.stringify({
          companyId: id,
          companyIdType: DATAFINITY_KEY,
        }),
      }));
    }
    return fields;
  }
};

const productId = (obj) => {
  const fields = [];

  for (const key of obj.keys) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        productId: key,
        productIdType: DATAFINITY_KEY,
      }),
    }));
  }

  const ids = Object.entries(obj).filter((el) => Object.values(OBJECT_IDS).some((id) => el.includes(id)));

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
};

const avatar = async (obj) => {
  if (!Array.isArray(obj.imageURLs)) return;
  for (const image of obj.imageURLs) {
    try {
      const response = await axios.get(image);

      if (response.status !== 200) {
        continue;
      }

      const bodyFormData = new FormData();

      bodyFormData.append('imageUrl', image);
      const resp = await axios.post(
        process.env.SAVE_IMAGE_URL,
        bodyFormData,
        {
          headers: bodyFormData.getHeaders(),
        },
      );

      return formField({
        fieldName: OBJECT_FIELDS.AVATAR,
        locale: obj.locale,
        user: obj.user,
        body: resp.data.image,
      });
    } catch (error) {
      console.error(error.message);
    }
  }
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
  const tagCategory = wobject.fields.find((field) => field.name === FIELDS_FOR_TAGS.TAG_CATEGORY);
  const categoryItems = wobject.fields.filter((field) => field.name === FIELDS_FOR_TAGS.CATEGORY_ITEM && field.id === tagCategory.id);
  const categoryItemsToSave = datafinityObject.fields.filter((field) => field.name === FIELDS_FOR_TAGS.CATEGORY_ITEM);

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
    const accessKey = process.env.POSITIONSTACK_KEY;
    const query = `${_.get(object, 'postalCode')} ${_.get(object, 'address')}, ${_.get(object, 'city')} `;
    const resp = await axios.get(`http://api.positionstack.com/v1/forward?access_key=${accessKey}&query=${query}`);
    const data = _.get(resp, 'data.data');
    if (_.isEmpty(data)) return { error: new Error('No data') };

    return { map: _.pick(data[0], ['latitude', 'longitude']) };
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
  const { map, error } = await tryGetMapFromName(object);
  if (error) return;

  return formField({
    fieldName: OBJECT_FIELDS.MAP,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify(map),
  });
};

const address = async (object) => formField({
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
  return fields;
};

const workTime = async (object) => {
  if (_.isEmpty(object.hours)) return;
  const body = _.reduce(object.hours, (acc, el) => `${acc}${el.day} ${el.hour}\n`, '');

  return formField({
    fieldName: OBJECT_FIELDS.WEBSITE,
    locale: object.locale,
    user: object.user,
    body,
  });
};

const website = async (object) => {
  if (_.isEmpty(object.websites)) return;

  return formField({
    fieldName: OBJECT_FIELDS.LINK,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({ title: `${object.name} Website`, link: object.websites[0] }),
  });
};
