const { parseAmazonPageLinks, extractASINs, formatAsins } = require('../helpers/amazonParseHelper');
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

const parseAsinsByUri = async ({ uri }) => {
  const { links, asins } = await parseAmazonPageLinks(uri);
  const asinsFromLinks = extractASINs(links);
  const allAsins = [...new Set([...asins, ...asinsFromLinks])];

  const notPublishedAsins = await getNotPublishedAsins({ asins: allAsins });

  return {
    result: formatAsins(allAsins),
    notPublished: formatAsins(notPublishedAsins),
  };
};

module.exports = {
  parseAsinsByUri,
  getNotPublishedAsins,
};
