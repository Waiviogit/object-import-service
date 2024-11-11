const {
  Wobj, DuplicateListStatusModel, DuplicateListObjectModel, App,
} = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError } = require('../../../constants/httpErrors');
const duplicateProcess = require('./duplicateProcess');
const { getAllObjectsInListForImport } = require('../../helpers/wObjectHelper');
const { IMPORT_STATUS } = require('../../../constants/appData');
const { createUUID } = require('../../helpers/cryptoHelper');

const getListItems = async ({
  user, authorPermlink, scanEmbedded, importId,
}) => {
  const { app } = await App.getOne({ host: 'waivio.com' });

  const links = await getAllObjectsInListForImport({
    authorPermlink, handledItems: [authorPermlink], scanEmbedded, app,
  });

  if (!links.length) return;

  const { result: objects } = await Wobj.find({
    filter: { author_permlink: { $in: links } },
    projection: {
      author_permlink: 1,
      object_type: 1,
      default_name: 1,
    },
  });

  const objectsList = objects.filter((o) => o.object_type === OBJECT_TYPES.LIST);

  const duplicateObjects = objects.map((el) => ({
    user,
    importId,
    type: el.object_type,
    linkToDuplicate: el.author_permlink,
    name: el.default_name,
  }));

  await DuplicateListObjectModel.insertMany(duplicateObjects);

  await DuplicateListStatusModel.updateOne({
    filter: {
      user,
      importId,
    },
    update: {
      objectsCount: links.length,
      objectsListCount: objectsList.length,
      status: IMPORT_STATUS.ACTIVE,
    },
  });

  duplicateProcess({
    importId, user,
  });
};

const createDuplicateTask = async ({
  user, authorPermlink, scanEmbedded,
}) => {
  const importId = createUUID();

  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: new NotFoundError('Object not found') };
  if (object.object_type !== OBJECT_TYPES.LIST) return { error: new NotAcceptableError('Not a list') };

  const { result: task } = await DuplicateListStatusModel.create({
    user,
    importId,
    rootObject: authorPermlink,
    objectsCount: 0,
    objectsListCount: 0,
    status: IMPORT_STATUS.PENDING,
  });

  getListItems({
    user, authorPermlink, scanEmbedded, importId,
  });

  return {
    result: task,
  };
};

module.exports = createDuplicateTask;
