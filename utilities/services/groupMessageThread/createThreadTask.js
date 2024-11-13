const { setTimeout } = require('node:timers/promises');
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

const getStatus = async (user) => {
  const { result } = await ThreadStatusModel.findOne({
    filter: { user, status: { $in: [IMPORT_STATUS.WAITING_RECOVER, IMPORT_STATUS.ACTIVE] } },
    projection: { _id: 1 },
  });
  if (result) return IMPORT_STATUS.PENDING;
  return IMPORT_STATUS.ACTIVE;
};

const processGroup = async ({ importId, user }) => {
  const userImport = await ThreadStatusModel.getUserImport({ importId, user });
  if (!userImport) return;
  const {
    skip, limit, groupPermlink, pagePermlink,
  } = userImport;

  const users = [];
  let nextCursor;
  while (true) {
    const {
      result, hasMore, nextCursor: cursor, error,
    } = await getObjectGroup({
      nextCursor,
      limit: 50,
      authorPermlink: groupPermlink,
    });
    nextCursor = cursor;

    const filterGuest = result.filter((el) => !el.name.includes('_'));

    users.push(...filterGuest.map((el) => ({ recipient: el.name, alias: el.alias })));

    if (error) {
      await setTimeout(15000);
      continue;
    }

    // name push
    if (!hasMore) break;
    if (limit > 0 && users.length >= skip + limit) break;
  }
  if (!users.length) return;

  const sliceTo = skip + limit === 0 ? users.length : skip + limit;

  const dataToWrite = users
    .slice(skip, sliceTo)
    .map((el) => ({ ...el, importId, pagePermlink }));

  const status = await getStatus(user);

  await ThreadMessageModel.insertMany(dataToWrite);
  await ThreadStatusModel.updateOne({
    filter: { importId },
    update: {
      usersTotal: dataToWrite.length,
      status,
    },
  });

  if (status === IMPORT_STATUS.ACTIVE) threadMessage({ importId, user });
};

const createThreadTask = async ({
  groupPermlink,
  pagePermlink,
  limit,
  skip,
  user,
  avoidRepetition,
  locale,
  dailyLimit,
}) => {
  const objectsError = await checkObjects({
    groupPermlink,
    pagePermlink,
  });
  if (objectsError) return { error: objectsError };

  const { result: processedPage } = await getObject({ authorPermlink: pagePermlink, locale });
  const pageContent = processedPage?.pageContent;
  if (!pageContent) return { error: NotFoundError('page content not found') };

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
    dailyLimit,
  });

  processGroup({ importId, user });

  return { result };
};

module.exports = createThreadTask;
