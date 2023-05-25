const { checkObjectExistsByBodyArray, createAsinVariations } = require('../helpers/importDatafinityHelper');
const { OBJECT_FIELDS } = require('../../constants/objectTypes');

const getNotPublishedAsins = async ({ asins }) => {
  const result = [];
  for (const asin of asins) {
    const published = await checkObjectExistsByBodyArray({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      bodyArr: createAsinVariations(asin),
    });
    if (published) continue;
    result.push(asin);
  }
  return result;
};

module.exports = {
  getNotPublishedAsins,
};
