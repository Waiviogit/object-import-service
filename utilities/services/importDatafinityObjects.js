const EventEmitter = require('events');
const _ = require('lodash');
const uuid = require('uuid');
const {
  DatafinityObject, Wobj, ObjectType, ImportStatusModel,
} = require('../../models');
const {
  OBJECT_TYPES, OBJECT_IDS, OBJECT_FIELDS,
} = require('../../constants/objectTypes');
const { addWobject, addField } = require('./importObjectsService');
const { parseJson } = require('../helpers/jsonHelper');
const { IMPORT_STATUS } = require('../../constants/appData');
const { formField } = require('../helpers/formFieldHelper');
const {
  filterImportObjects, bufferToArray, needToSaveObject, prepareObjectForImport, specialFieldsHelper, validateSameFields,
} = require('../helpers/importDatafinityHelper');
const { validateImportToRun } = require('../helpers/importDatafinityValidationHelper');
const { parseFields } = require('./parseObjectFields/mainFieldsParser');

const saveObjects = async ({
  products, user, objectType, authority, locale, translate, importId,
}) => {
  for (const product of products) {
    product.importId = importId;
    product.user = user;
    product.object_type = objectType;
    product.locale = locale;
    product.translate = translate;
    if (authority) {
      product.authority = authority;
    }
    product.fields = await parseFields(product);

    const save = needToSaveObject(product);
    if (!save) continue;

    const { result, error } = await DatafinityObject.create(product);
    if (error) continue;
    await ImportStatusModel.updateOne({
      filter: { importId },
      update: {
        $inc: {
          objectsCount: 1,
          fieldsCount: product.fields.length,
        },
      },
    });
  }

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

const importObjects = async ({
  file, user, objectType, authority, locale, translate,
}) => {
  const products = bufferToArray(file.buffer);

  if (_.isEmpty(products)) {
    return { error: new Error('products not found') };
  }
  const importId = uuid.v4();
  const uniqueProducts = filterImportObjects({ products, objectType });
  if (_.isEmpty(uniqueProducts)) return { error: new Error('products already exists or has wrong type') };

  await ImportStatusModel.create({
    importId,
    user,
    objectsCount: 0,
    objectType,
    authority,
  });

  saveObjects({
    products: uniqueProducts,
    user,
    objectType,
    authority,
    locale,
    translate,
    importId,
  });

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

const startObjectImport = async ({
  user, authorPermlink = null, importId, createdId,
}) => {
  const { datafinityObject, error } = await DatafinityObject.getOne({
    user,
    ...(importId && { importId }),
    ...(authorPermlink && { author_permlink: authorPermlink }),
    ...(createdId && { _id: createdId }),
  });

  if (authorPermlink) {
    await updateImportedObjectsList({
      datafinityObject, user, authorPermlink,
    });
  }

  if (!datafinityObject && importId) {
    await finishImport({ importId, user });
    return;
  }

  if (error || !datafinityObject) {
    console.error(error.message);
    return;
  }

  const createNew = !datafinityObject.author_permlink;

  const runImport = await validateImportToRun({ datafinityObject, user, authorPermlink });
  if (!runImport) return;

  if (createNew) {
    await createObject(datafinityObject);
    // trigger new import from parser
  } else if (authorPermlink || datafinityObject.author_permlink) {
    const { wobject, error: dbError } = await Wobj.getOne({
      author_permlink: authorPermlink || datafinityObject.author_permlink,
    });

    if (dbError) return;

    if (!datafinityObject.fields.length) {
      await DatafinityObject.removeOne(datafinityObject._id);
      emitStart({
        user: datafinityObject.user,
        importId: datafinityObject.importId,
        ...(
          datafinityObject.startAuthorPermlink
            && { authorPermlink: datafinityObject.startAuthorPermlink }
        ),
      });
      return;
    }

    const { result: updatedObj, error: processErr } = await processField({
      datafinityObject,
      wobject,
      user,
    });
    if (!updatedObj) return;
    if (processErr) return;

    emitStart({
      user: datafinityObject.user,
      authorPermlink: datafinityObject.author_permlink,
      importId: datafinityObject.importId,
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

const createFieldObject = async ({ field, datafinityObject }) => {
  const formObject = {
    authors: createPersonFromAuthors,
  };
  return formObject[field.name]({ field, datafinityObject });
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
  };
  return fieldCheck[field.name]({ field });
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
  const fields = _.filter(datafinityObject.fields,
    (f) => _.includes([OBJECT_FIELDS.PRODUCT_ID, OBJECT_FIELDS.COMPANY_ID], f.name));
  for (const field of fields) {
    const { result, error } = await Wobj.findOne({
      filter: { fields: { $elemMatch: { name: field.name, body: field.body } } },
    });
    if (error) {
      console.error(error.message);

      return;
    }

    return result;
  }
};

module.exports = { importObjects, startObjectImport };
