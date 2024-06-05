const uuid = require('uuid');
const { Wobj, DescriptionObjectModel, DescriptionStatusModel } = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError, ServiceUnavailableError } = require('../../../constants/httpErrors');
const waivioApi = require('../../waivioApi');
const rewriteDescription = require('./rewriteDescription');
const { IMPORT_STATUS } = require('../../../constants/appData');

const createDescriptionList = async ({
  authorPermlink, scanEmbedded, user,
}) => {
  const importId = uuid.v4();
  const { result: links, error: getListErr } = await waivioApi
    .getListItemLinks({ authorPermlink, scanEmbedded });

  if (getListErr) return { error: new ServiceUnavailableError('getListItemLinks Error') };

  if (!links.length) return { error: new NotFoundError('List not found') };

  const { result: objects } = await Wobj.find({
    filter: { author_permlink: { $in: links } },
    projection: {
      author_permlink: 1,
      object_type: 1,
      default_name: 1,
    },
  });

  const { result: task } = await DescriptionStatusModel.create({
    user,
    importId,
    baseList: authorPermlink,
    objectsCount: links.length,
  });

  const duplicateObjects = objects.map((el) => ({
    user,
    importId,
    type: el.object_type,
    authorPermlink: el.author_permlink,
    name: el.default_name,
  }));

  await DescriptionObjectModel.insertMany(duplicateObjects);

  rewriteDescription({ importId, user });

  return {
    result: task,
  };
};

const fetchAllObjectFromMap = async ({
  importId, user, authorPermlink, object,
}) => {
  let skip = 0;
  const limit = 500;

  await DescriptionObjectModel.insertMany([{
    user,
    importId,
    type: object.object_type,
    authorPermlink: object.author_permlink,
    name: object.default_name,
  }]);

  while (true) {
    const { result, error } = await waivioApi.getObjectsFromMap({
      authorPermlink, skip, limit,
    });
    skip += limit;
    if (error) return { error };

    const { result: objects } = await Wobj.find({
      filter: { author_permlink: { $in: result?.result } },
      projection: {
        author_permlink: 1,
        object_type: 1,
        default_name: 1,
      },
    });

    const duplicateObjects = objects.map((el) => ({
      user,
      importId,
      type: el.object_type,
      authorPermlink: el.author_permlink,
      name: el.default_name,
    }));

    await DescriptionObjectModel.insertMany(duplicateObjects);
    ///
    if (!result.hasMore) break;
  }

  const { result: objectsCount } = await DescriptionObjectModel
    .countDocuments({ filter: { importId } });

  await DescriptionStatusModel.updateOne({
    filter: { importId },
    update: { objectsCount, status: IMPORT_STATUS.ACTIVE },
  });

  rewriteDescription({ importId, user });
};

const createDescriptionMap = async ({ user, authorPermlink, object }) => {
  const importId = uuid.v4();

  const { result: task } = await DescriptionStatusModel.create({
    user,
    importId,
    baseList: authorPermlink,
    status: IMPORT_STATUS.PENDING,
    objectsCount: 0,
  });

  fetchAllObjectFromMap({
    importId, user, authorPermlink, object,
  });

  return {
    result: task,
  };
};

const createByType = {
  [OBJECT_TYPES.LIST]: createDescriptionList,
  [OBJECT_TYPES.MAP]: createDescriptionMap,
  default: () => ({ error: new NotAcceptableError('Wrong object type') }),
};

const createDuplicateTask = async ({
  user, authorPermlink, scanEmbedded,
}) => {
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: new NotFoundError('Object not found') };

  return (createByType[object.object_type] || createByType.default)({
    authorPermlink, scanEmbedded, user, object,
  });
};

module.exports = createDuplicateTask;
