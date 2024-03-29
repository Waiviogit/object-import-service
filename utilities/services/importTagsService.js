const _ = require('lodash');
const importObjectsService = require('./importObjectsService');
const { Wobj } = require('../../models');

const importTags = async ({ tags }) => {
  for (const tag of tags) {
    const notValidChars = tag.match(/[^a-z0-9\-!?]+/g);

    if (!_.isEmpty(notValidChars)) {
      continue;
    }

    const { wobject } = await Wobj.getOne({ author_permlink: tag, object_type: 'hashtag' });

    if (!wobject) {
      const wobject = {
        author_permlink: tag,
        object_type: 'hashtag',
        default_name: tag,
        is_extending_open: true,
        is_posting_open: true,
        creator: 'monterey',
        fields: [],
      };

      await importObjectsService.addWobjectsToQueue({ wobjects: [wobject] });
    }
  }
};

module.exports = { importTags };
