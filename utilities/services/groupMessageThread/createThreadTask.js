const { Wobj, ThreadStatusModel } = require('../../../models');
const { NotFoundError } = require('../../../constants/httpErrors');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { getObject } = require('../../waivioApi');
const { createUUID } = require('../../helpers/cryptoHelper');

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

const processGroup = async ({ importId }) => {

};

const createThreadTask = async ({
  groupPermlink,
  pagePermlink,
  limit,
  skip,
  user,
  avoidRepetition,
  locale,
}) => {
  const objectsError = await checkObjects({
    groupPermlink,
    pagePermlink,
  });
  if (objectsError) return { error: objectsError };

  const { result: processedPage } = await getObject({ authorPermlink: pagePermlink, locale });
  const pageContent = processedPage?.pageContent;
  if (!pageContent) return NotFoundError('page content not found');

  const importId = createUUID();
  const { result } = await ThreadStatusModel.create({
    importId,
    user,
    avoidRepetition,
    skip,
    limit,
    locale,
    pageContent,
  });

  return { result };
};

module.exports = createThreadTask;
