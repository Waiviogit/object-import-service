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
} = require('../../constants/objectTypes');
const { Wobj, DatafinityObject } = require('../../models');
const { puppeteerBrowser } = require('../puppeteer/browser');
const { formField } = require('./formFieldHelper');

exports.prepareFieldsForImport = async (obj) => {
  const fields = [];

  if (obj.authority) {
    fields.push(formField({
      fieldName: 'authority',
      body: obj.authority,
      user: obj.user,
      objectName: obj.name,
    }));
  }
  const fieldTypes = FIELDS_BY_OBJECT_TYPE[obj.object_type];

  for (const fieldsElementHandle of fieldTypes) {
    const field = await fieldsHandle[fieldsElementHandle](obj);

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
      objectName: obj.name,
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
      objectName: obj.name,
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
      objectName: obj.name,
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
      objectName: obj.name,
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
      objectName: obj.name,
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
      objectName: obj.name,
    });
  }
};

const authors = async (obj) => {
  const fields = [];

  if (!_.get(obj, 'person_permlinks.length')) {
    return;
  }

  for (const author of obj.person_permlinks) {
    const field = await formFieldByExistingObject(author);

    if (field) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.AUTHORS,
        body: JSON.stringify(field),
        user: obj.user,
        objectName: obj.name,
      }));
    }
  }

  return fields;
};

const formFieldByExistingObject = async (author_permlink) => {
  const { wobject, error } = await Wobj.getOne({ author_permlink });

  if (!wobject || error) {
    return;
  }

  return {
    name: wobject.name,
    authorPermlink: wobject.author_permlink,
  };
};

const publisher = async (obj) => {
  const objPublisher = _.get(obj, 'brand');

  if (objPublisher) {
    return formField({
      fieldName: OBJECT_FIELDS.PUBLISHER,
      objectName: obj.name,
      user: obj.user,
      body: JSON.stringify({ name: objPublisher }),
    });
  }
};

const options = async (obj) => {
  const formats = obj.features.find((el) => el.key.toLowerCase().includes('format'));

  if (!formats) {
    const url = obj.prices.find((el) => el.sourceURLs[0].includes('amazon.com'));

    if (!url) {
      return;
    }

    const page = await puppeteerBrowser.goToObjectPage(url.sourceURLs[0]);
    const scrapedFormats = await puppeteerBrowser.getFormats(page);

    await puppeteerBrowser.close();
    if (!scrapedFormats.length) {
      return;
    }

    const formatsAmazon = formFormats(scrapedFormats, obj);

    if (!formatsAmazon.length) {
      return;
    }

    return formatsAmazon;
  }

  const uniqFormats = _.uniq(formats.value);
  const formatsDatafinity = formFormats(uniqFormats, obj);

  if (formatsDatafinity.length) {
    return formatsDatafinity;
  }
};

const productId = (obj) => {
  const fields = [];

  for (const key of obj.keys) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      objectName: obj.name,
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
        objectName: obj.name,
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
        objectName: obj.name,
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
      objectName: obj.name,
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
      objectName: obj.name,
      user: obj.user,
      body: JSON.stringify({
        category: 'format',
        value: uniqFormats[count],
        position: count,
        image: obj.imageURLs[count],
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
};
