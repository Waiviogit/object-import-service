const { parseAmazonPageLinks, extractASINs, formatAsins } = require('../helpers/amazonParseHelper');

const parseAsinsByUri = async ({ uri }) => {
  const amazonLinks = await parseAmazonPageLinks(uri);
  const asins = extractASINs(amazonLinks);
  const formattedAsins = formatAsins(asins);

  return { result: formattedAsins };
};

module.exports = parseAsinsByUri;
