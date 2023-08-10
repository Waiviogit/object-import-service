const _ = require('lodash');
const uuid = require('uuid');
const {
  Wobj, DepartmentsObjectModel, DepartmentsStatusModel,
} = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { NotFoundError, NotAcceptableError } = require('../../../constants/httpErrors');
const importDepartments = require('./importDepartments');
const { getListItemDepartments } = require('../../waivioApi');

const uniqueByTwoKeys = (arr) => arr.reduce((acc, curr) => {
  const found = acc.find((item) => item.authorPermlink === curr.authorPermlink
        && item.department === curr.department);
  if (!found) acc.push(curr);
  return acc;
}, []);

const transformData = (data) => {
  const result = [];

  data.forEach((item) => {
    item.objects.forEach((obj) => {
      item.departments.forEach((dept) => {
        result.push({
          authorPermlink: obj,
          department: dept,
        });
      });
    });
  });

  return result;
};

const getListObjectsWithDepartments = async ({ authorPermlink, scanEmbedded }) => {
  const { result, error } = await getListItemDepartments({ authorPermlink, scanEmbedded });
  if (error) return [];

  const transformedData = transformData(result);
  const dataWithoutDuplicates = uniqueByTwoKeys(transformedData);

  const ordered = _.orderBy(dataWithoutDuplicates, ['authorPermlink'], ['asc']);

  return ordered;
};

const saveDocuments = async ({
  docs, user, importId, authorPermlink,
}) => {
  const uniqObjects = _.uniqBy(docs, 'authorPermlink');

  const { error: inserError } = await DepartmentsObjectModel.insertMany(
    docs.map((el) => ({
      user,
      importId,
      authorPermlink: el.authorPermlink,
      department: el.department,
    })),
  );
  if (inserError) return { error: inserError };

  const { result, error } = await DepartmentsStatusModel.create({
    importId,
    user,
    objectsCount: uniqObjects.length,
    lists: [authorPermlink],
  });
  if (error) return { error };

  return { result: result.toObject() };
};

const createDepartmentsList = async ({ user, authorPermlink, scanEmbedded }) => {
  const { result: object } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  if (!object) return { error: new NotFoundError('Object not found') };
  if (object.object_type !== OBJECT_TYPES.LIST) return { error: new NotAcceptableError('Object is not ype of list') };
  const objectsWithDepartments = await getListObjectsWithDepartments({
    authorPermlink, scanEmbedded,
  });
  if (!objectsWithDepartments?.length) return { error: new NotFoundError('Objects in list not found') };
  const importId = uuid.v4();
  const { result, error } = await saveDocuments({
    docs: objectsWithDepartments, user, importId, authorPermlink,
  });
  if (error) return { error: new NotAcceptableError('Save docs Error') };

  importDepartments({ user, importId });
  return result;
};

module.exports = createDepartmentsList;
