const _ = require('lodash');
const { OBJECTS_FROM_FIELDS, OBJECT_IDS, BOOK_FIELDS } = require('../../constants/objectTypes');
const { Wobj } = require('../../models');
const { generateUniquePermlink } = require('./permlinkGenerator');
const { puppeteerBrowser } = require('../puppeteer/browser');
const { formField } = require('./formFieldHelper');

exports.formPersonObjects = async (obj) => {
  const priceDataWithUrl = obj.prices.find((el) => el.sourceURLs[0].includes('amazon.com'));

  if (!priceDataWithUrl) {
    return;
  }

  const page = await puppeteerBrowser.goToObjectPage(priceDataWithUrl.sourceURLs.find((el) => el.includes('amazon.com')));
  const authorsData = await puppeteerBrowser.getAuthorsData(page);

  await puppeteerBrowser.close();
  const { datafinityObjects, fields } = await formAuthors(authorsData, obj);

  return { datafinityObjects, fields };
};

const formDatafinityObject = async ({ data, obj, objectType }) => {
  const productIdBody = JSON.stringify({ productId: data.asin, productIdType: OBJECT_IDS.ASINS });
  const { wobject, error } = await Wobj.findOneByProductId(productIdBody, objectType);

  if (wobject || error) {
    return;
  }

  return {
    user: obj.user,
    name: data.name,
    object_type: objectType,
    author_permlink: await generateUniquePermlink(data.name),
    fields: formAuthorFields({ obj, data, productIdBody }),
    datafinityObject: true
  };
};

const formAuthors = async (authors, obj) => {
  const datafinityObjects = [];

  for (const author of authors) {
    if (_.get(author, 'asin')) {
      datafinityObjects.push(await formDatafinityObject({
        data: author,
        obj,
        objectType: OBJECTS_FROM_FIELDS.PERSON,
      }));
    } else {
      const field = formField({
        fieldName: BOOK_FIELDS.AUTHORS,
        objectName: author.name,
        user: obj.user,
        body: JSON.stringify({ name: author.name }),
      });

      obj.fields = obj.fields.length ? obj.fields.push(field) : [field];
    }
  }

  return { datafinityObjects: datafinityObjects.filter((el) => el), fields: obj.fields ? obj.fields : [] };
};

const formAuthorFields = ({ obj, data, productIdBody }) => {
  const fields = [];

  if (obj.authority) {
    fields.push(formField({
      fieldName: 'authority',
      body: obj.authority,
      user: obj.user,
      objectName: data.name,
    }));
  }
  fields.push(formField({
    fieldName: BOOK_FIELDS.PRODUCT_ID,
    objectName: data.name,
    user: obj.user,
    body: productIdBody,
  }));

  return fields;
};
