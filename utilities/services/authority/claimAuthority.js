const uuid = require('uuid');
const { Wobj, AuthorityStatusModel, AuthorityObjectModel } = require('../../../models');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../constants/objectTypes');
const waivioApi = require('../../waivioApi');
const { parseJson } = require('../../helpers/jsonHelper');
const claimProcess = require('./claimProcess');
const { NotFoundError} = require('../../../constants/httpErrors');

const getListObjectsFromArr = async ({ authorPermlinks, scanEmbedded }) => {
  const result = [];
  for (const authorPermlink of authorPermlinks) {
    const { result: listItems, error } = await waivioApi.getListItemLinks({
      authorPermlink, scanEmbedded,
    });
    if (error) return { error };
    result.push(...listItems);
  }
  return { result };
};

const createClaimTask = async ({
  links = [], user, authority, lists,
}) => {
  const importId = uuid.v4();

  const { error: inserError } = await AuthorityObjectModel.insertMany(
    links.map((el) => ({
      user,
      importId,
      authorPermlink: el,
    })),
  );
  if (inserError) return { error: inserError };

  const { result, error } = await AuthorityStatusModel.create({
    importId,
    user,
    authority,
    objectsCount: links.length,
    lists,
  });
  if (error) return { error };
  return { result: result.toObject() };
};

const getListItemsFromMenu = ({ fields }) => fields
  .filter((el) => el.name === OBJECT_FIELDS.MENU_ITEM)
  .map((el) => parseJson(el.body))
  .filter((el) => el?.objectType === OBJECT_TYPES.LIST)
  .map((el) => el.linkToObject);

const claimAuthority = async ({
  user, authorPermlink, authority, scanEmbedded,
}) => {
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: { status: 404, message: 'Not Found' } };

  if (object.object_type === OBJECT_TYPES.LIST) {
    const { result: links, error } = await waivioApi
      .getListItemLinks({ authorPermlink, scanEmbedded });
    if (error) return { error };
    if (!links.length) return { error: new NotFoundError('Objects not found') };
    const { result, error: createError } = await createClaimTask({
      links,
      user,
      authority,
      lists: [object.author_permlink],
    });
    if (createError) return { error: createError };
    claimProcess({
      user: result.user,
      importId: result.importId,
    });
    return { result };
  }
  if (object.object_type === OBJECT_TYPES.BUSINESS) {
    const authorPermlinks = getListItemsFromMenu({ fields: object.fields });
    const { result: links, error } = await getListObjectsFromArr({ authorPermlinks, scanEmbedded });
    if (error) return { error };
    links.push(object.author_permlink);
    const { result, error: createError } = await createClaimTask({
      links,
      user,
      authority,
      lists: authorPermlinks,
    });
    if (createError) return { error: createError };
    claimProcess({
      user: result.user,
      importId: result.importId,
    });
    return { result };
  }

  return { error: { status: 422, message: 'Wrong object type' } };
};

module.exports = claimAuthority;
