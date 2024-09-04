const EventEmitter = require('events');
const _ = require('lodash');
const crypto = require('node:crypto');
const {
  DatafinityObject, Wobj, ObjectType, ImportStatusModel,
} = require('../../models');
const {
  OBJECT_TYPES, OBJECT_IDS, OBJECT_FIELDS, VIRTUAL_FIELDS,
} = require('../../constants/objectTypes');
const { addWobject, addField } = require('./importObjectsService');
const { parseJson } = require('../helpers/jsonHelper');
const {
  IMPORT_STATUS, IMPORT_REDIS_KEYS, AMAZON_ASINS, IMPORT_TYPES,
} = require('../../constants/appData');
const { formField } = require('../helpers/formFieldHelper');
const {
  prepareObjectForImport,
  specialFieldsHelper,
  validateSameFields,
  createReversedJSONStringArray,
  createAsinVariations,
  getProductRating,
  checkRatingFields,
} = require('../helpers/importDatafinityHelper');
const { checkImportActiveStatus } = require('../helpers/importDatafinityValidationHelper');
const { parseFields } = require('./parseObjectFields/mainFieldsParser');
const { redisGetter, redisSetter } = require('../redis');
const { makeAuthorDescription } = require('./gptService');
const { sendUpdateImportForUser } = require('./socketClient');
const { addDatafinityDataToProducts } = require('../datafinitiApi/operations');
const { validateImportToRun } = require('../../validators/accountValidator');
const { createRecipeObjectsForImport } = require('./recipeGeneration/recipeGeneration');

const getFieldsCount = (fields = []) => {
  const realFields = fields.filter((el) => !Object.values(VIRTUAL_FIELDS).includes(el.name));
  return realFields.length;
};

const saveObjects = async ({
  objects, user, objectType, authority, locale, translate, importId, useGPT,
}) => {
  for (const object of objects) {
    object.importId = importId;
    object.user = user;
    object.object_type = objectType;
    object.locale = locale;
    object.translate = translate;
    if (authority) object.authority = authority;
    object.useGPT = useGPT;
    object.rating = getProductRating(object);
    object.fields = await parseFields(object);

    const result = await DatafinityObject.create(object);
    if (result?.error) continue;

    await ImportStatusModel.updateOne({
      filter: { importId },
      update: { $inc: { objectsCount: 1, fieldsCount: getFieldsCount(object.fields) } },
    });
    await sendUpdateImportForUser({ account: user });
  }

  const recovering = await redisGetter.get({ key: IMPORT_REDIS_KEYS.STOP_FOR_RECOVER });
  const status = recovering ? IMPORT_STATUS.WAITING_RECOVER : IMPORT_STATUS.ACTIVE;

  await redisSetter.delImportWobjData(`${IMPORT_REDIS_KEYS.PENDING}:${importId}`);

  await ImportStatusModel.updateOne({
    filter: { importId },
    update: { status },
  });

  emitStart({
    user,
    importId,
  });
};

const emitStart = ({
  user,
  authorPermlink = null,
  importId,
  createdId,
}) => {
  const myEE = new EventEmitter();

  myEE.once('import', async () => startObjectImport({
    user, authorPermlink, importId, createdId,
  }));
  myEE.emit('import');
};

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
  const importId = crypto.randomUUID();
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

const finishImport = async ({ importId, user }) => {
  await ImportStatusModel.updateOne({
    filter: { importId, user },
    update: {
      status: IMPORT_STATUS.FINISHED,
      finishedAt: new Date(),
    },
  });
};

const updateImportedObjectsList = async ({ datafinityObject, user, authorPermlink }) => {
  await ImportStatusModel.updateOne({
    filter: {
      importId: datafinityObject.importId,
      user,
    },
    update: {
      $addToSet: { objectsLinks: authorPermlink },
    },
  });
};

// if return undefined exit from import function if return object continue import
const getImportObject = async ({
  importId, authorPermlink, user, createdId,
}) => {
  if (importId) {
    const activeStatus = await checkImportActiveStatus(importId);
    if (!activeStatus) return;
  }

  const { datafinityObject, error } = await DatafinityObject.getOne({
    user,
    ...(importId && { importId }),
    ...(authorPermlink && { author_permlink: authorPermlink }),
    ...(createdId && { _id: createdId }),
  });

  if (!datafinityObject && importId) {
    await finishImport({ importId, user });
    await sendUpdateImportForUser({ account: user });
    return;
  }

  if (authorPermlink) {
    await updateImportedObjectsList({
      datafinityObject, user, authorPermlink,
    });
  }

  if (error || !datafinityObject) {
    console.error(error.message);
    return;
  }
  // need to check twice
  if (!importId) {
    const activeStatus = await checkImportActiveStatus(datafinityObject.importId);
    if (!activeStatus) return;
  }

  return datafinityObject;
};

const startObjectImport = async ({
  user, authorPermlink = null, importId, createdId,
}) => {
  const importedObject = await getImportObject({
    importId, authorPermlink, user, createdId,
  });
  if (!importedObject) return;

  const createNew = !importedObject.author_permlink;

  const runImport = await validateImportToRun({
    user, authorPermlink, importId: importedObject.importId, type: IMPORT_TYPES.OBJECTS,
  });
  if (!runImport) return;

  if (createNew) {
    await createObject(importedObject);
    await sendUpdateImportForUser({ account: user });
    // trigger new import from parser
  } else if (authorPermlink || importedObject.author_permlink) {
    const { wobject, error: dbError } = await Wobj.getOne({
      author_permlink: authorPermlink || importedObject.author_permlink,
    });

    if (dbError) return;
    // rating
    await checkRatingFields({
      dbObject: wobject,
      dfObject: importedObject,
    });

    if (!importedObject.fields.length) {
      const { startAuthorPermlink } = importedObject;

      await DatafinityObject.removeOne(importedObject._id);
      emitStart({
        user: importedObject.user,
        importId: importedObject.importId,
        ...(startAuthorPermlink && { authorPermlink: startAuthorPermlink }),
      });
      return;
    }

    const { result: updatedObj, error: processErr } = await processField({
      datafinityObject: importedObject,
      wobject,
      user,
    });
    if (!updatedObj || processErr) return;
    await sendUpdateImportForUser({ account: user });

    emitStart({
      user: importedObject.user,
      authorPermlink: importedObject.author_permlink,
      importId: importedObject.importId,
    });
  }
};

const updateDatafinityObject = async (obj, datafinityObject) => {
  if (datafinityObject.fields.length) {
    await DatafinityObject
      .updateOne({ _id: datafinityObject._id }, { author_permlink: obj.author_permlink });
    return;
  }
  await DatafinityObject.removeOne(datafinityObject._id);
};

const createPersonFromAuthors = async ({ datafinityObject, field }) => {
  const productIdBody = JSON.stringify({ productId: field.asin, productIdType: OBJECT_IDS.ASINS });

  const fieldBody = parseJson(field.body, null);

  const fields = [];

  fields.push(formField({
    fieldName: OBJECT_FIELDS.PRODUCT_ID,
    user: datafinityObject.user,
    body: productIdBody,
    locale: datafinityObject.locale,
  }));

  // description chat gpt
  if (field.bookName && datafinityObject.useGPT) {
    const description = await makeAuthorDescription({
      author: fieldBody.name, book: field.bookName,
    });

    if (description) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.DESCRIPTION,
        user: datafinityObject.user,
        body: description,
        locale: datafinityObject.locale,
      }));
    }
  }

  const object = {
    user: datafinityObject.user,
    importId: datafinityObject.importId,
    object_type: OBJECT_TYPES.PERSON,
    authority: datafinityObject.authority,
    startAuthorPermlink: datafinityObject.author_permlink,
    name: fieldBody.name,
    locale: datafinityObject.locale,
  };

  const supposedFields = await parseFields(object);
  if (supposedFields.length) {
    fields.push(...supposedFields);
  }
  object.fields = fields;
  return object;
};

const createList = async ({ field, datafinityObject }) => ({
  user: datafinityObject.user,
  importId: datafinityObject.importId,
  object_type: OBJECT_TYPES.LIST,
  authority: datafinityObject.authority,
  startAuthorPermlink: datafinityObject.author_permlink,
  name: OBJECT_TYPES.LIST,
  locale: datafinityObject.locale,
  author_permlink: field.body,
  fields: [
    formField({
      fieldName: 'listItem',
      user: datafinityObject.user,
      body: datafinityObject.author_permlink,
      locale: datafinityObject.locale,
    }),
  ],
});

const createFieldObject = async ({ field, datafinityObject }) => {
  const formObject = {
    authors: createPersonFromAuthors,
    addToList: createList,
    default: () => {},
  };

  return (formObject[field.name] || formObject.default)({ field, datafinityObject });
};

const existConnectedAuthors = async ({ field }) => {
  const productIdBody = JSON.stringify({ productId: field.asin, productIdType: OBJECT_IDS.ASINS });
  const { result } = await Wobj.findOne({
    filter: { fields: { $elemMatch: { name: OBJECT_FIELDS.PRODUCT_ID, body: productIdBody } } },
  });
  if (!result) return false;
  const fieldBody = parseJson(field.body, null);
  field.body = JSON.stringify({ name: fieldBody.name, authorPermlink: result.author_permlink });
  return true;
};

const existConnectedObject = async ({ field }) => {
  const fieldCheck = {
    authors: existConnectedAuthors,
    default: () => false,
  };
  return (fieldCheck[field.name] || fieldCheck.default)({ field });
};

const checkFieldConnectedObject = async ({ datafinityObject }) => {
  const field = datafinityObject.fields[0];
  if (!field) return false;
  if (!field.connectedObject) return false;

  const { result: existedDatafinity } = await DatafinityObject.findOne({
    filter: { startAuthorPermlink: datafinityObject.author_permlink },
  });

  if (existedDatafinity) {
    emitStart({
      user: datafinityObject.user,
      authorPermlink: existedDatafinity.author_permlink,
      importId: datafinityObject.importId,
      createdId: existedDatafinity._id.toString(),
    });
    return true;
  }
  const existObject = await existConnectedObject({ field });
  if (existObject) return false;

  const newImportObject = await createFieldObject({ field, datafinityObject });
  const { result } = await DatafinityObject.create(newImportObject);

  await ImportStatusModel.updateOne({
    filter: { importId: datafinityObject.importId },
    update: {
      $inc: {
        objectsCount: 1,
        fieldsCount: newImportObject.fields.length,
      },
    },
  });

  emitStart({
    user: datafinityObject.user,
    createdId: result._id.toString(),
    importId: datafinityObject.importId,
  });
  return true;
};

const processField = async ({ datafinityObject, wobject, user }) => {
  const exit = await checkFieldConnectedObject({ datafinityObject });
  if (exit) return { result: false };
  await specialFieldsHelper({ datafinityObject, wobject });
  const sameField = validateSameFields({ fieldData: datafinityObject.fields[0], wobject });

  if (!sameField) {
    await addField({
      field: datafinityObject.fields[0],
      wobject,
      importingAccount: user,
      importId: datafinityObject.importId,
    });
    await ImportStatusModel.updateOne({
      filter: { importId: datafinityObject.importId },
      update: {
        $inc: {
          fieldsCreatedCount: 1,
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  if (sameField) console.error(`same field ${JSON.stringify(datafinityObject.fields[0])}`);

  const { result, error } = await DatafinityObject.findOneAndModify(
    { _id: datafinityObject._id },
    { $pop: { fields: -1 } },
  );

  if (error) {
    console.error(error.message);

    return { error };
  }
  return { result };
};

const createObject = async (datafinityObject) => {
  const { objectType: objType, error: dbErr } = await ObjectType
    .getOne({ name: datafinityObject.object_type });

  if (dbErr) {
    console.error(dbErr.message);
    return;
  }

  const existedObject = await getWobjectByKeys(datafinityObject);
  if (existedObject) {
    await updateDatafinityObject(existedObject, datafinityObject);
    emitStart({
      user: datafinityObject.user,
      authorPermlink: existedObject.author_permlink,
    });
    return;
  }

  const obj = await prepareObjectForImport(datafinityObject);
  console.log(obj.author_permlink, 'creating datafinity object');

  await addWobject({ wobject: obj, existObjType: objType, addData: false });
  await updateDatafinityObject(obj, datafinityObject);
};

const getWobjectByKeys = async (datafinityObject) => {
  const fields = _.filter(
    datafinityObject.fields,
    (f) => _.includes([OBJECT_FIELDS.PRODUCT_ID, OBJECT_FIELDS.COMPANY_ID, OBJECT_FIELDS.URL], f.name),
  );

  for (const field of fields) {
    if (field.name === OBJECT_FIELDS.URL) {
      const { result, error } = await Wobj.findOne({
        filter: {
          fields: {
            $elemMatch: {
              name: field.name,
              body: field.body,
            },
          },
        },
      });
      if (error) {
        console.error(error.message);
        continue;
      }
      if (result) {
        return result;
      }
      return;
    }
    const parsedBody = parseJson(field.body, null);

    const keyIds = AMAZON_ASINS.includes(_.get(parsedBody, 'productIdType'))
      ? createAsinVariations(parsedBody.productId)
      : createReversedJSONStringArray(field.body);

    const { result, error } = await Wobj.findOne({
      filter: {
        fields: {
          $elemMatch: {
            name: field.name,
            body: { $in: keyIds },
          },
        },
      },
    });
    if (error) {
      console.error(error.message);
      continue;
    }
    if (result) {
      return result;
    }
  }
};

module.exports = { importObjects, startObjectImport, saveObjects };
