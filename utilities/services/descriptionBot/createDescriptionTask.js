const uuid = require('uuid');
const { Wobj, DescriptionObjectModel, DescriptionStatusModel } = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError, ServiceUnavailableError } = require('../../../constants/httpErrors');
const waivioApi = require('../../waivioApi');
const rewriteDescription = require('./rewriteDescription');

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

module.exports = createDuplicateTask;
