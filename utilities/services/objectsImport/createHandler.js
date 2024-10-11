const { createRecipeObjectsForImport } = require('../recipeGeneration/recipeGeneration');
const { addDatafinityDataToProducts } = require('../../datafinitiApi/operations');
const { ImportStatusModel } = require('../../../models');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS } = require('../../../constants/appData');
const { redisSetter } = require('../../redis');
const { saveObjects } = require('./importDatafinityObjects');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { createUUID } = require('../../helpers/cryptoHelper');

const startSaveObjects = ({ objectType }) => objectType !== OBJECT_TYPES.RECIPE;

const startAdditionalProcessing = ({ objectType }) => objectType === OBJECT_TYPES.RECIPE;

const additionalProcessingByType = {
  [OBJECT_TYPES.RECIPE]: createRecipeObjectsForImport,
  default: () => {},
};

const getAdditionalHandlerByType = (objectType) => additionalProcessingByType[objectType]
    || additionalProcessingByType.default;

const importObjects = async ({
  user,
  objectType,
  authority,
  locale,
  translate,
  useGPT,
  addDatafinityData,
  objects,
}) => {
  const importId = createUUID();
  if (addDatafinityData) await addDatafinityDataToProducts(objects);

  await ImportStatusModel.create({
    status: IMPORT_STATUS.PENDING,
    objectsCount: 0,
    importId,
    objectType,
    authority,
    user,
    locale,
    translate,
    useGPT,
  });
  await redisSetter.set({
    key: `${IMPORT_REDIS_KEYS.PENDING}:${importId}`,
    value: user,
  });

  const startSave = startSaveObjects({ objectType });
  const additionalProcessing = startAdditionalProcessing({ objectType });

  if (additionalProcessing) {
    const handler = getAdditionalHandlerByType(objectType);

    handler({
      importId, objects, user, locale, authority,
    });
  }

  if (startSave) {
    saveObjects({
      objects,
      user,
      objectType,
      authority,
      locale,
      translate,
      importId,
      useGPT,
    });
  }

  return { result: importId };
};

module.exports = {
  importObjects,
};
