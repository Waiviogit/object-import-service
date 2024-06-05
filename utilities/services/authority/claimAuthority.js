const uuid = require('uuid');
const { Wobj, AuthorityStatusModel, AuthorityObjectModel } = require('../../../models');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../constants/objectTypes');
const waivioApi = require('../../waivioApi');
const { parseJson } = require('../../helpers/jsonHelper');
const claimProcess = require('./claimProcess');
const { NotFoundError } = require('../../../constants/httpErrors');
const { IMPORT_STATUS } = require('../../../constants/appData');

const getListObjectsFromArr = async ({ authorPermlinks, scanEmbedded }) => {
  const result = [];
  for (const authorPermlink of authorPermlinks) {
    const { result: listItems, error } = await waivioApi.getListItemLinksAuthority({
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

const claimList = async ({
  user, authorPermlink, authority, scanEmbedded, object,
}) => {
  const { result: links, error } = await waivioApi
    .getListItemLinksAuthority({ authorPermlink, scanEmbedded });
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
};

const claimBusiness = async ({
  user, authorPermlink, authority, scanEmbedded, object,
}) => {
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
};

const fetchAllObjectFromMap = async ({ importId, user, authorPermlink }) => {
  let skip = 0;
  const limit = 500;
  console.log('fetchAllObjectFromMap');

  while (true) {
    const { result, error } = await waivioApi.getObjectsFromMap({
      authorPermlink, skip, limit,
    });
    skip += limit;
    if (error) {
      console.log('waivioApi getObjectsFromMap error', error);
      return { error };
    }

    const { error: inserError } = await AuthorityObjectModel.insertMany(
      result?.result.map((el) => ({
        user,
        importId,
        authorPermlink: el,
      })),
    );
    if (inserError) {
      console.log('inserError AuthorityObjectModel', inserError);
      return { error: inserError };
    }
    ///
    if (!result.hasMore) break;
  }

  const { result: objectsCount } = await AuthorityObjectModel
    .countDocuments({ filter: { importId } });

  await AuthorityStatusModel.updateOne({
    filter: { importId },
    update: { objectsCount, status: IMPORT_STATUS.ACTIVE },
  });
  claimProcess({
    user,
    importId,
  });
};

const claimMap = async ({
  user, authorPermlink, authority, scanEmbedded, object,
}) => {
  const importId = uuid.v4();

  const { result, error: statusError } = await AuthorityStatusModel.create({
    importId,
    user,
    authority,
    objectsCount: 0,
    status: IMPORT_STATUS.PENDING,
    lists: [object.author_permlink],
  });
  if (statusError) return { statusError };

  fetchAllObjectFromMap({
    importId, user, authorPermlink,
  });

  return { result: result.toObject() };
};

const claimByType = {
  [OBJECT_TYPES.LIST]: claimList,
  [OBJECT_TYPES.BUSINESS]: claimBusiness,
  [OBJECT_TYPES.MAP]: claimMap,
  default: () => ({ error: { status: 422, message: 'Wrong object type' } }),
};

const claimAuthority = async ({
  user, authorPermlink, authority, scanEmbedded,
}) => {
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: { status: 404, message: 'Not Found' } };

  return (claimByType[object.object_type] || claimByType.default)({
    user, authorPermlink, authority, scanEmbedded, object,
  });
};

module.exports = claimAuthority;
