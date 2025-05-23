const EventEmitter = require('events');
const { setTimeout } = require('node:timers/promises');
const _ = require('lodash');
const {
  DatafinityObject, Wobj, ObjectType, ImportStatusModel,
} = require('../../../models');
const {
  OBJECT_TYPES, OBJECT_IDS, OBJECT_FIELDS, VIRTUAL_FIELDS,
} = require('../../../constants/objectTypes');
const { addWobject, addField } = require('../importObjectsService');
const { parseJson } = require('../../helpers/jsonHelper');
const {
  IMPORT_STATUS, IMPORT_REDIS_KEYS, AMAZON_ASINS, IMPORT_TYPES, REDIS_CHANNEL,
} = require('../../../constants/appData');
const { formField } = require('../../helpers/formFieldHelper');
const {
  prepareObjectForImport,
  specialFieldsHelper,
  validateSameFields,
  createReversedJSONStringArray,
  createAsinVariations,
  getProductRating,
  checkRatingFields,
} = require('../../helpers/importDatafinityHelper');
const { checkImportActiveStatus } = require('../../helpers/importDatafinityValidationHelper');
const { parseFields } = require('../parseObjectFields/mainFieldsParser');
const { redisGetter, redisSetter } = require('../../redis');
const { makeAuthorDescription } = require('../gptService');
const { sendUpdateImportForUser } = require('../socketClient');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { getObject } = require('../../waivioApi');
const { ARRAY_FIELDS } = require('../../../constants/wobjectsData');
const { voteForField } = require('../../objectBotApi');

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
    object.object_type = object?.object_type || objectType;
    object.locale = locale;
    object.translate = translate;
    if (authority) object.authority = authority;
    object.useGPT = useGPT;
    object.rating = getProductRating(object);
    object.fields = await parseFields(object);

    // get status for long imports
    const importTask = await ImportStatusModel.findOneByImportId(importId);
    if (!importTask) return;
    if (importTask.status === IMPORT_STATUS.DELETED) return;

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

const finishImport = async ({ importId, user }) => {
  const { result } = await ImportStatusModel.findOne({ filter: { importId, user } });
  if (!result) return;

  await ImportStatusModel.updateOne({
    filter: { importId, user },
    update: {
      status: IMPORT_STATUS.FINISHED,
      finishedAt: new Date(),
    },
  });

  if (!result.onFinish) return;
  await redisSetter.publish({
    message: result.onFinish,
    channel: REDIS_CHANNEL.FINISH_IMPORT_EVENT,
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

  /** race condition somewhere need to check importId without params
   * to finish import on purpose
   * */

  const { datafinityObject, error } = await DatafinityObject.getOne({
    user,
    ...(importId && { importId }),
    ...(authorPermlink && { author_permlink: authorPermlink }),
    ...(createdId && { _id: createdId }),
  });

  const { datafinityObject: lastImportObject } = await DatafinityObject.getOne({
    user,
    importId,
  });

  if (!lastImportObject && importId) {
    console.log(`finishImport ___________ 
    importId: ${importId} 
    authorPermlink: ${authorPermlink} 
    user: ${user} 
    createdId: ${createdId}`);
    await finishImport({ importId, user });
    await sendUpdateImportForUser({ account: user });
    return;
  }

  if (authorPermlink && datafinityObject) {
    await updateImportedObjectsList({
      datafinityObject, user, authorPermlink,
    });
  }

  if (error || !datafinityObject) {
    console.error(error?.message ?? `datafinityObject not found 
    importId: ${importId} 
    authorPermlink: ${authorPermlink} 
    user: ${user} 
    createdId: ${createdId}`);
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
  console.log(user, 'startObjectImport');
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
      const fieldsToVote = await getFieldsToVote({ wobject, user });
      if (fieldsToVote.length) await voteForFields({ fieldsToVote, user, wobject });

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

const createList = async ({ field, datafinityObject }) => {
  // we need this if parser will be slow not posting lot of updates
  await DatafinityObject.updateOne(
    { _id: datafinityObject._id },
    { $pop: { fields: -1 } },
  );

  return {
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
  };
};

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

const existConnectedList = async ({ field, datafinityObject }) => {
  const { result } = await Wobj.findOne({
    filter: {
      author_permlink: field.body,
      fields: {
        $elemMatch: {
          name: OBJECT_FIELDS.LIST_ITEM,
          body: datafinityObject.author_permlink,
        },
      },
    },
  });
  return !!result;
};

const existConnectedObject = async ({ field, datafinityObject }) => {
  const fieldCheck = {
    authors: existConnectedAuthors,
    addToList: existConnectedList,
    default: () => false,
  };
  return (fieldCheck[field.name] || fieldCheck.default)({ field, datafinityObject });
};

const checkFieldConnectedObject = async ({ datafinityObject }) => {
  const field = datafinityObject.fields[0];
  if (!field) return false;
  if (!field.connectedObject) return false;

  const { result: existedDatafinity } = await DatafinityObject.findOne({
    filter: {
      startAuthorPermlink: datafinityObject.author_permlink,
      importId: datafinityObject.importId,
    },
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
  const existObject = await existConnectedObject({ field, datafinityObject });
  if (existObject) return false;

  const newImportObject = await createFieldObject({ field, datafinityObject });
  const { result } = await DatafinityObject.create(newImportObject);

  const addObjectsCount = datafinityObject.object_type !== OBJECT_TYPES.RECIPE;

  await ImportStatusModel.updateOne({
    filter: { importId: datafinityObject.importId },
    update: {
      $inc: {
        ...(addObjectsCount && { objectsCount: 1 }),
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

const getFieldsToVote = async ({ wobject, user }) => {
  /** if field created by user or already has user's vote skip it */

  // to wait all fields to process
  await setTimeout(10000);

  const { wobject: object } = await Wobj.getOne({
    author_permlink: wobject.author_permlink,
  });

  const singleFieldsNotVote = _.reduce(object.fields, (acc, el) => {
    if (ARRAY_FIELDS.includes(el.name)) return acc;
    const votedSingleField = _.find(
      el.active_votes,
      (v) => v.voter === user && v.weight > 0,
    );
    if (votedSingleField) {
      acc.push(el.name);
      return acc;
    }

    if (el.creator === user) acc.push(el.name);
    return acc;
  }, []);

  const filteredFields = _.filter(object.fields, (el) => {
    const creatorNotUser = el.creator !== user;
    const userNotHasPositiveVote = !_.find(
      el.active_votes,
      (v) => v.voter === user && v.weight > 0,
    );

    return creatorNotUser && userNotHasPositiveVote;
  });

  if (!filteredFields?.length) return [];

  const { result: originalProcessed } = await getObject({
    authorPermlink: object.author_permlink,
  });

  const fieldsToVote = [];

  for (const field of filteredFields) {
    if (singleFieldsNotVote.includes(field.name)) continue;
    if (field.name === OBJECT_FIELDS.AUTHORITY) continue;

    if (ARRAY_FIELDS.includes(field.name)) {
      if (field?.weight < 0) continue;
      fieldsToVote.push(field);
      continue;
    }

    const singleFields = _.filter(filteredFields, (el) => el.name === field.name);
    if (singleFields?.length === 1) {
      fieldsToVote.push(field);
      continue;
    }

    const alreadyIn = _.find(fieldsToVote, (el) => el.name === field.name);
    if (alreadyIn) continue;

    const fieldToVote = _.find(fieldsToVote, (f) => f.body === originalProcessed[field.name]);
    if (fieldToVote) fieldsToVote.push(fieldToVote);
  }

  return _.compact(fieldsToVote);
};

const voteForFields = async ({ fieldsToVote, user, wobject }) => {
  for (const field of fieldsToVote) {
    await voteForField.send({
      voter: user,
      authorPermlink: wobject.author_permlink,
      author: field.author,
      permlink: field.permlink,
      fieldType: field.name,
      shouldWhiteListVote: true,
    });
    await setTimeout(4000);
  }
};

const processField = async ({ datafinityObject, wobject, user }) => {
  const exit = await checkFieldConnectedObject({ datafinityObject });
  if (exit) return { result: false };
  await specialFieldsHelper({ datafinityObject, wobject });
  const field = datafinityObject.fields[0];

  const sameField = validateSameFields({ fieldData: field, wobject });

  if (!sameField) {
    await addField({
      field,
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
    await setTimeout(4000);
  }

  if (sameField) {
    console.error(`same field: ${datafinityObject.fields[0]?.name}`);
  }

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

module.exports = { startObjectImport, saveObjects };
