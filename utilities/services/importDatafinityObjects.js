const EventEmitter = require('events');
const _ = require('lodash');
const detectLanguage = require('utilities/helpers/detectLanguage');
const uuid = require('uuid');
const {
  DatafinityObject, Wobj, ObjectType, ImportStatusModel,
} = require('../../models');
const { prepareFieldsForImport, addTagsIfNeeded } = require('../helpers/bookFieldsHelper');
const { generateUniquePermlink } = require('../helpers/permlinkGenerator');
const { formPersonObjects } = require('../helpers/formPersonObject');
const { VOTE_COST } = require('../../constants/voteAbility');
const { OBJECT_TYPES, OBJECTS_FROM_FIELDS } = require('../../constants/objectTypes');
const { addWobject, addField } = require('./importObjectsService');
const { parseJson } = require('../helpers/jsonHelper');
const { importAccountValidator } = require('../../validators/accountValidator');
const { IMPORT_STATUS } = require('../../constants/appData');

const bufferToArray = (buffer) => {
  let stringFromBuffer = buffer.toString();
  const expectValid = stringFromBuffer[0] === '[';
  if (!expectValid) {
    stringFromBuffer = `[${stringFromBuffer.replace(/(}\r\n{|}\n{)/g, '},{')}]`;
  }
  return parseJson(stringFromBuffer, []);
};

const saveObjects = async ({
  products, user, objectType, authority, importName,
}) => {
  if (_.isEmpty(products)) {
    return { error: new Error('products not found') };
  }
  const importId = uuid.v4();
  products.forEach((product) => {
    product.importId = importId;
    product.user = user;
    product.object_type = objectType;
    if (authority) {
      product.authority = authority;
    }
  });
  const { count, error } = await DatafinityObject.insertMany(products);

  if (error || !count) {
    return { error: (error || new Error('objects not created')) };
  }
  await ImportStatusModel.create({
    importId,
    user,
    objectsCount: count,
    ...(importName && { name: importName }),
  });

  return { result: count };
};

const emitStart = (user, authorPermlink = null) => {
  const myEE = new EventEmitter();

  myEE.once('import', async () => startObjectImport(user, authorPermlink));
  myEE.emit('import');
};

const importObjects = async ({
  file, user, objectType, authority, importName,
}) => {
  const products = bufferToArray(file.buffer);

  const { result, error } = await saveObjects({
    products,
    user,
    objectType,
    authority,
    importName,
  });
  if (error) return { error };

  emitStart(user);

  return { result };
};

const checkImportActiveStatus = async (importId) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const status = _.get(importDoc, 'status');
  return status === IMPORT_STATUS.ACTIVE;
};

const startObjectImport = async (user, authorPermlink = null) => {
  const { result: validAcc } = await importAccountValidator(user, VOTE_COST.USUAL);

  if (!validAcc) {
    // поставить ттл, посчитать через сколько
  }

  let objToCreate;
  const { datafinityObject, error } = await DatafinityObject.getOne({
    user,
    object_type: OBJECTS_FROM_FIELDS.PERSON,
    ...authorPermlink && { author_permlink: authorPermlink },
  });

  if (error) {
    console.error(error.message);
    return;
  }

  objToCreate = datafinityObject;

  if (!datafinityObject) {
    const { datafinityObject: book, error: e } = await DatafinityObject.getOne({
      user,
      object_type: OBJECT_TYPES.BOOK,
      ...authorPermlink && { author_permlink: authorPermlink },
    });

    objToCreate = book;
  }

  const processObject = !objToCreate.author_permlink
      || objToCreate.object_type === OBJECTS_FROM_FIELDS.PERSON;

  const activeStatus = await checkImportActiveStatus(objToCreate.importId);
  if (!activeStatus) return;

  if (processObject) {
    // trigger new import from parser
    await processNewObject(objToCreate);
  } else if (authorPermlink) {
    const { wobject, error: dbError } = await Wobj.getOne({
      author_permlink: authorPermlink,
    });

    if (dbError) return;

    const { result: updatedObj, error: processErr } = await processField({
      datafinityObject: objToCreate,
      wobject,
      user,
    });
    if (processErr) return;

    if (!updatedObj.fields.length) {
      await DatafinityObject.removeOne(updatedObj._id);
      emitStart(datafinityObject.user);
      return;
    }

    emitStart(datafinityObject.user, datafinityObject.author_permlink);
  }
};

const prepareObjectForImport = async (datafinityObject) => {
  const permlink = datafinityObject.author_permlink ? datafinityObject.author_permlink : await generateUniquePermlink(datafinityObject.name);

  return {
    object_type: datafinityObject.object_type,
    author_permlink: permlink,
    creator: datafinityObject.user,
    default_name: datafinityObject.name,
    locale: detectLanguage(datafinityObject.name),
    is_extending_open: true,
    is_posting_open: true,
    ...datafinityObject.object_type === OBJECT_TYPES.BOOK && { fields: await prepareFieldsForImport(datafinityObject) },
    datafinityObject: true,
  };
};

const updateDatafinityObject = async (obj, datafinityObject) => {
  if (!obj.author_permlink) {
    await DatafinityObject.updateOne({ _id: datafinityObject._id }, { author_permlink: obj.author_permlink });
  }

  if (obj.fields && obj.fields.length) {
    await DatafinityObject.updateOne(
      { _id: datafinityObject._id },
      { $addToSet: { fields: { $each: obj.fields } } },
    );
  } else {
    await DatafinityObject.removeOne(datafinityObject._id);
  }
};

const processNewObject = async (datafinityObject) => {
  const isCreateAuthors = datafinityObject.object_type === OBJECT_TYPES.BOOK
      && !datafinityObject.person_permlinks.length && !datafinityObject.fields.length;

  if (isCreateAuthors) {
    await createAuthors(datafinityObject);
  } else {
    await createObject(datafinityObject);
  }
};

const processField = async ({ datafinityObject, wobject, user }) => {
  if (datafinityObject.object_type === OBJECT_TYPES.BOOK) {
    await addTagsIfNeeded(datafinityObject, wobject);
  }
  await addField({
    field: datafinityObject.fields[0],
    wobject,
    importingAccount: user,
  });
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

const createAuthors = async (datafinityObject) => {
  const { datafinityObjects, fields } = await formPersonObjects(datafinityObject);

  if (fields.length) {
    await DatafinityObject.updateOne(
      { _id: datafinityObject._id },
      { $addToSet: { fields: { $each: fields } } },
    );
  }
  if (datafinityObjects.length) {
    await DatafinityObject.updateOne(
      { _id: datafinityObject._id },
      { $addToSet: { person_permlinks: { $each: datafinityObjects.map((el) => el.author_permlink) } } },
    );
    const { result, error } = await DatafinityObject.create(datafinityObjects);

    if (error) {
      console.error(error.message);

      return;
    }

    await createObject(result[0]);
  }
};

const createObject = async (datafinityObject) => {
  const obj = await prepareObjectForImport(datafinityObject);
  const { objectType: objType, error: dbErr } = await ObjectType.getOne({ name: obj.object_type });

  if (dbErr) {
    console.error(dbErr.message);

    return;
  }

  await addWobject({ wobject: obj, existObjType: objType, addData: false });
  await updateDatafinityObject(obj, datafinityObject);
};

const checkIfWobjectExists = async (datafinityObject) => {
  if (!datafinityObject.keys) return;

  return getWobjectByKeys(datafinityObject.keys);
};

const getWobjectByKeys = async (keys) => {
  for (const key of keys) {
    const textMatch = `\"${key}\"`;
    const regexMatch = JSON.stringify({ productId: key, productIdType: DATAFINITY_KEY });
    const { result, error } = await Wobj.findSameFieldBody(textMatch, regexMatch);
    if (error) {
      console.error(error.message);

      return;
    }

    return result;
  }
};

module.exports = { importObjects, startObjectImport };
