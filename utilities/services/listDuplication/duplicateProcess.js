const { DuplicateListObjectModel, ObjectType, DuplicateListStatusModel } = require('../../../models');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { prepareObjectForImport } = require('../../helpers/importDatafinityHelper');
const { addWobject } = require('../importObjectsService');

const checkObjectsToCreate = async ({ importId }) => {
  const { count } = await DuplicateListObjectModel.count({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
      duplicateCreated: false,
    },
  });

  return !!count;
};

const createDuplicateObject = async ({ importId, user }) => {
  const { result } = await DuplicateListObjectModel.findOne({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
      duplicateCreated: false,
    },
  });
  if (!result) return;

  const wobject = await prepareObjectForImport({
    user,
    name: result.name,
    object_type: result.type,
  });

  const { objectType: existObjType } = await ObjectType
    .getOne({ name: wobject.object_type });

  console.log(wobject.author_permlink, 'creating duplicate object');

  await addWobject({ wobject, existObjType, addData: false });

  await DuplicateListObjectModel.updateOne({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
    },
    update: {
      $set: { duplicateCreated: true },
    },
  });

  await DuplicateListStatusModel.updateOne({
    filter: { importId },
    update: {
      $inc: { objectsCreated: 1 },
    },
  });
};

const duplicateProcess = async ({ importId, user }) => {
  // todo check power + check status
  const createObject = await checkObjectsToCreate({ importId });
  if (createObject) {
    return createDuplicateObject({ importId, user });
  }
};

module.exports = duplicateProcess;
