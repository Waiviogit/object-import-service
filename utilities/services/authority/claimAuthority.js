const uuid = require('uuid');
const {
  Wobj, AuthorityStatusModel, AuthorityObjectModel, App,
} = require('../../../models');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../constants/objectTypes');
const waivioApi = require('../../waivioApi');
const { parseJson } = require('../../helpers/jsonHelper');
const claimProcess = require('./claimProcess');
const { IMPORT_STATUS } = require('../../../constants/appData');
const { getAllObjectsInList } = require('../../helpers/wObjectHelper');

const getListObjectsFromArr = async ({ authorPermlinks, scanEmbedded }) => {
  const result = [];
  const { app } = await App.getOne({ host: 'waivio.com' });
  for (const authorPermlink of authorPermlinks) {
    const listItems = await getAllObjectsInList({ app, authorPermlink, scanEmbedded });
    result.push(...listItems);
  }
  return result;
};

const updateClaimTask = async ({
  user, importId, authorPermlinks, scanEmbedded,
}) => {
  const links = await getListObjectsFromArr({ authorPermlinks, scanEmbedded });

  const { error: inserError } = await AuthorityObjectModel.insertMany(
    links.map((el) => ({
      user,
      importId,
      authorPermlink: el,
    })),
  );
  if (inserError) return { error: inserError };

  await AuthorityStatusModel.updateOne({
    filter: {
      importId,
      user,
    },
    update: {
      objectsCount: links.length,
      status: IMPORT_STATUS.ACTIVE,
    },
  });

  claimProcess({
    user,
    importId,
  });
};

const getListItemsFromMenu = ({ fields }) => fields
  .filter((el) => el.name === OBJECT_FIELDS.MENU_ITEM)
  .map((el) => parseJson(el.body))
  .filter((el) => el?.objectType === OBJECT_TYPES.LIST)
  .map((el) => el.linkToObject);

const claimList = async ({
  user, authorPermlink, authority, scanEmbedded, object,
}) => {
  const importId = uuid.v4();

  const authorPermlinks = [authorPermlink];

  const { result, error: statusError } = await AuthorityStatusModel.create({
    importId,
    user,
    authority,
    objectsCount: 0,
    status: IMPORT_STATUS.PENDING,
    lists: authorPermlinks,
  });

  if (statusError) return { error: statusError };

  updateClaimTask({
    user, scanEmbedded, importId, authorPermlinks,
  });

  return { result };
};

const claimBusiness = async ({
  user, authorPermlink, authority, scanEmbedded, object,
}) => {
  const importId = uuid.v4();
  const authorPermlinks = getListItemsFromMenu({ fields: object.fields });

  const { result, error: statusError } = await AuthorityStatusModel.create({
    importId,
    user,
    authority,
    objectsCount: 0,
    status: IMPORT_STATUS.PENDING,
    lists: authorPermlinks,
  });
  if (statusError) return { error: statusError };

  updateClaimTask({
    user, scanEmbedded, importId, authorPermlinks,
  });

  return { result };
};

const fetchAllObjectFromMap = async ({ importId, user, authorPermlink }) => {
  let skip = 0;
  const limit = 500;

  await AuthorityObjectModel.insertMany([{
    user,
    importId,
    authorPermlink,
  }]);

  while (true) {
    const { result, error } = await waivioApi.getObjectsFromMap({
      authorPermlink, skip, limit,
    });
    skip += limit;
    if (error) {
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
  if (statusError) return { error: statusError };

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
