const { Wobj } = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError } = require('../../../constants/httpErrors');
const waivioApi = require('../../waivioApi');

const createDuplicateTask = async ({
  user, authorPermlink, authority, scanEmbedded,
}) => {
  // get all list items from author permlink
  // 2 create object list schema for each  with types.
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: new NotFoundError('Object not found') };
  if (object.object_type !== OBJECT_TYPES.LIST) return { error: new NotAcceptableError('Not a list') };

};
