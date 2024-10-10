const { Wobj, ThreadStatusModel, ThreadMessageModel } = require('../../../models');
const { NotFoundError } = require('../../../constants/httpErrors');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { getObject, getObjectGroup } = require('../../waivioApi');
const { createUUID } = require('../../helpers/cryptoHelper');
const { IMPORT_STATUS } = require('../../../constants/appData');
const threadMessage = require('./threadMessage');

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

const processGroup = async ({ importId, user }) => {
  const userImport = await ThreadStatusModel.getUserImport({ importId, user });
  if (!userImport) return;
  const {
    skip, limit, groupPermlink, pagePermlink,
  } = userImport;

  const users = [];

  while (true) {
    const lastName = users.at(-1) ?? '';
    const { result, hasMore, error } = await getObjectGroup({
      lastName,
      limit: 50,
      authorPermlink: groupPermlink,
    });

    users.push(...result.map((el) => el.name));

    if (error) {
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }

    // name push
    if (!hasMore) break;
    if (limit > 0 && users.length >= skip + limit) break;
  }
  if (!users.length) return;

  const dataToWrite = users
    .slice(skip, skip + limit)
    .map((el) => ({
      importId,
      recipient: el,
      pagePermlink,
    }));

  // TODO check if any others import

  await ThreadMessageModel.insertMany(dataToWrite);
  await ThreadStatusModel.updateOne({
    filter: { importId },
    update: {
      usersTotal: dataToWrite.length,
      status: IMPORT_STATUS.ACTIVE,
    },
  });

  threadMessage({ importId, user });
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
    groupPermlink,
    pagePermlink,
    pageContent,
  });

  processGroup({ importId, user });

  return { result };
};

module.exports = createThreadTask;
