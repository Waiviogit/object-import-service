const { sendSearchRequestByAsins } = require('./products');
const { OBJECT_IDS } = require('../../constants/objectTypes');

const KEYS_ARR = [
  OBJECT_IDS.VIN,
  OBJECT_IDS.EAN13,
  OBJECT_IDS.EAN8,
  OBJECT_IDS.ISBN,
  OBJECT_IDS.UPCA,
  OBJECT_IDS.UPCE,
];

const addDatafinityDataToProduct = async (product) => {
  if (!product.asins) return;
  const { result, error } = await sendSearchRequestByAsins(product.asins);
  if (error) return;
  const domains = [];
  const sourceURLs = [];
  for (const resultElement of result) {
    for (const productId of KEYS_ARR) {
      if (resultElement[productId]) {
        product[productId] = resultElement[productId];
      }
    }
    if (resultElement.domains) {
      domains.push(...resultElement.domains);
    }
    if (resultElement.sourceURLs) {
      sourceURLs.push(...resultElement.sourceURLs);
    }
  }

  if (domains.length) product.domains = domains;
  if (sourceURLs.length) product.sourceURLs = sourceURLs;
  return product;
};

const addDatafinityDataToProducts = async (products) => {
  for (const product of products) {
    await addDatafinityDataToProduct(product);
  }
};

module.exports = {
  addDatafinityDataToProducts,
};
