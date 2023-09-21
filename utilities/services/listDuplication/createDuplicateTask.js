const uuid = require('uuid');
const { Wobj, DuplicateListStatusModel, DuplicateListObjectModel } = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError, ServiceUnavailableError } = require('../../../constants/httpErrors');
const waivioApi = require('../../waivioApi');
const duplicateProcess = require('./duplicateProcess');

const createDuplicateTask = async ({
  user, authorPermlink, scanEmbedded,
}) => {
  const importId = uuid.v4();
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: new NotFoundError('Object not found') };
  if (object.object_type !== OBJECT_TYPES.LIST) return { error: new NotAcceptableError('Not a list') };

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

  const objectsList = objects.filter((o) => o.object_type === OBJECT_TYPES.LIST);

  const { result: task } = await DuplicateListStatusModel.create({
    user,
    importId,
    rootObject: authorPermlink,
    objectsCount: links.length,
    objectsListCount: objectsList.length,
  });

  const duplicateObjects = objects.map((el) => ({
    user,
    importId,
    type: el.object_type,
    linkToDuplicate: el.author_permlink,
    name: el.default_name,
  }));

  await DuplicateListObjectModel.insertMany(duplicateObjects);

  duplicateProcess({
    importId, user,
  });

  return {
    result: task,
  };
};

module.exports = createDuplicateTask;
