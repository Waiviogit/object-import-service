const { Wobj } = require('../../../models');
const { NotFoundError, NotAcceptableError } = require('../../../constants/httpErrors');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');

const checkObjects = async ({
  groupPermlink,
  pagePermlink,
}) => {
  const { result: group } = await Wobj.findOne({
    filter: { author_permlink: groupPermlink, object_type: OBJECT_TYPES.GROUP },
    projection: { author_permlink: 1 },
  });
  if (!group) return NotFoundError('group object not found');
  const { result: page } = await Wobj.findOne({
    filter: { author_permlink: pagePermlink, object_type: OBJECT_TYPES.PAGE },
    projection: { author_permlink: 1 },
  });
  if (!page) return NotFoundError('page object not found');
};

const createThreadTask = async ({
  groupPermlink,
  pagePermlink,
  limit,
  skip,
  userName,
  avoidRepetition,
}) => {
// check objects
  const objectsError = await checkObjects({
    groupPermlink,
    pagePermlink,
  });
  if (objectsError) return { error: objectsError };

  // pageContent
};

module.exports = createThreadTask;
