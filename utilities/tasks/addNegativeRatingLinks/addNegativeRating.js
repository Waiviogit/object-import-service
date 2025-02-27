const { Wobj } = require('../../../models');
const { checkRatingFields } = require('../../helpers/importDatafinityHelper');

const dangerousLinks = require('./dangerousLinks.json');

const addNegativeRating = async () => {
  const sites = dangerousLinks.map((el) => el.fieldUrl);

  for (const site of sites) {
    const { result } = await Wobj.findOne({
      filter: {
        object_type: 'link',
        fields: {
          $elemMatch: {
            name: 'url',
            body: site,
          },
        },
      },
    });
    if (!result) continue;
    await checkRatingFields({
      dbObject: result,
      dfObject: {
        rating: 1,
        user: 'waivio.affiliate',
      },
    });
    console.log(`${site} processed`);
  }
  console.log('task finished');
};

module.exports = addNegativeRating;
