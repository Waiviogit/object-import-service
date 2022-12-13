const EventEmitter = require('events');
const _ = require('lodash');
const uuid = require('uuid');
const BigNumber = require('bignumber.js');
const detectLanguage = require('../helpers/detectLanguage');
const {
  DatafinityObject, Wobj, ObjectType, ImportStatusModel,
} = require('../../models');
const { prepareFieldsForImport } = require('../helpers/bookFieldsHelper');
const { generateUniquePermlink } = require('../helpers/permlinkGenerator');
const { VOTE_COST } = require('../../constants/voteAbility');
const {
  OBJECT_TYPES, DATAFINITY_KEY, OBJECT_IDS, OBJECT_FIELDS,
} = require('../../constants/objectTypes');
const { addWobject, addField } = require('./importObjectsService');
const { parseJson } = require('../helpers/jsonHelper');
const { importAccountValidator, votePowerValidation } = require('../../validators/accountValidator');
const { IMPORT_STATUS, IMPORT_REDIS_KEYS, ONE_PERCENT_VOTE_RECOVERY } = require('../../constants/appData');
const { redisSetter } = require('../redis');
const { getVotingPowers } = require('../hiveEngine/hiveEngineOperations');
const { getTokenBalances, getRewardPool } = require('../hiveEngineApi/tokensContract');
const { getMinAmountInWaiv } = require('../helpers/checkVotePower');
const { formField } = require('../helpers/formFieldHelper');

const bufferToArray = (buffer) => {
  let stringFromBuffer = buffer.toString();
  const expectValid = stringFromBuffer[0] === '[';
  if (!expectValid) {
    stringFromBuffer = `[${stringFromBuffer.replace(/(}\r\n{|}\n{)/g, '},{')}]`;
  }
  return parseJson(stringFromBuffer, []);
};

const groupByAsins = (products) => {
  const uniqueProducts = [];
  const grouped = _.groupBy(products, 'asins');

  for (const groupedKey in grouped) {
    if (groupedKey === 'undefined') {
      uniqueProducts.push(...grouped[groupedKey]);
      continue;
    }
    if (grouped[groupedKey].length > 1) {
      uniqueProducts.push(_.maxBy(grouped[groupedKey], 'dateUpdated'));
      continue;
    }
    uniqueProducts.push(grouped[groupedKey][0]);
  }
  return uniqueProducts;
};

const filterImportRestaurants = (restaurants) => _.reduce(restaurants, (acc, el) => {
  if (!_.includes(el.categories, 'Restaurants')) return acc;
  if (el.isClosed === 'true') return acc;
  const duplicate = _.find(
    acc,
    (exist) => el.name === exist.name
          && el.address === exist.address
          && el.city === exist.city,
  );
  if (duplicate) {
    duplicate.ids ? duplicate.ids.push(el.id) : duplicate.ids = [el.id, duplicate.id];
    return acc;
  }
  acc.push(el);
  return acc;
}, []);

const filterImportObjects = ({
  products, objectType,
}) => {
  const filters = {
    restaurant: filterImportRestaurants,
    book: groupByAsins,
    default: () => products,
  };
  return (filters[objectType] || filters.default)(products);
};

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
    product.fields = await prepareFieldsForImport(product);
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

const checkImportActiveStatus = async (importId) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const status = _.get(importDoc, 'status');
  return status === IMPORT_STATUS.ACTIVE;
};

const getVotingPower = async ({ account, amount }) => {
  const tokenBalance = await getTokenBalances({ query: { symbol: 'WAIV', account }, method: 'findOne' });
  if (!tokenBalance) return 0;
  const { stake, delegationsIn } = tokenBalance;
  const pool = await getRewardPool({ query: { symbol: 'WAIV' }, method: 'findOne' });
  if (!pool) return 0;
  const { rewardPool, pendingClaims } = pool;
  const rewards = new BigNumber(rewardPool).dividedBy(pendingClaims);
  const finalRsharesCurator = new BigNumber(stake).plus(delegationsIn).div(2);

  const reverseRshares = new BigNumber(amount).dividedBy(rewards);

  return reverseRshares.times(100).div(finalRsharesCurator).times(100).toNumber();
};

const getTtlTime = async ({ votingPower, minVotingPower, account }) => {
  if (votingPower < minVotingPower) {
    const diff = minVotingPower - votingPower;
    return ONE_PERCENT_VOTE_RECOVERY * (diff / 100);
  }
  const amount = await getMinAmountInWaiv(account);
  const neededPower = await getVotingPower({ account, amount });
  if (neededPower < votingPower) return ONE_PERCENT_VOTE_RECOVERY;
  const diff = neededPower - votingPower;
  return ONE_PERCENT_VOTE_RECOVERY * (diff / 100);
};

const setTtlToContinue = async ({ user, authorPermlink, importId }) => {
  const { result: importDoc } = await ImportStatusModel.findOne({
    filter: { importId },
  });
  const { votingPower } = await getVotingPowers({ account: user });
  const ttl = await getTtlTime({
    votingPower,
    minVotingPower: importDoc.minVotingPower,
    account: user,
  });

  const key = `${IMPORT_REDIS_KEYS.CONTINUE}:${user}:${authorPermlink}:${importId}`;
  await redisSetter.set({ key, value: '' });
  await redisSetter.expire({ key, ttl });
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
    await ImportStatusModel.updateOne({
      filter: {
        importId: datafinityObject.importId,
        user,
      },
      update: {
        $addToSet: { objectsLinks: authorPermlink },
      },
    });
  }

  if (!datafinityObject && importId) {
    await ImportStatusModel.updateOne({
      filter: { importId, user },
      update: {
        status: IMPORT_STATUS.FINISHED,
        finishedAt: new Date(),
      },
    });
    return;
  }

  if (error || !datafinityObject) {
    console.error(error.message);
    return;
  }

  const createNew = !datafinityObject.author_permlink;

  const activeStatus = await checkImportActiveStatus(datafinityObject.importId);
  if (!activeStatus) return;

  const { result: validAcc } = await importAccountValidator(user, VOTE_COST.USUAL);
  const validVotePower = await votePowerValidation({ account: user, importId: datafinityObject.importId });
  if (!validVotePower || !validAcc) {
    await setTtlToContinue({ user, authorPermlink, importId: datafinityObject.importId });
    return;
  }

  if (createNew) {
    await createObject(datafinityObject);
    // trigger new import from parser
  } else if (authorPermlink) {
    const { wobject, error: dbError } = await Wobj.getOne({
      author_permlink: authorPermlink,
    });

    if (dbError) return;

    const { result: updatedObj, error: processErr } = await processField({
      datafinityObject,
      wobject,
      user,
    });

    if (processErr) return;

    if (!updatedObj.fields.length) {
      await DatafinityObject.removeOne(updatedObj._id);
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

    emitStart({
      user: datafinityObject.user,
      authorPermlink: datafinityObject.author_permlink,
      importId: datafinityObject.importId,
    });
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
    fields: datafinityObject.fields,
    datafinityObject: true,
  };
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

  if (datafinityObject.authority) {
    fields.push(formField({
      fieldName: 'authority',
      body: datafinityObject.authority,
      user: datafinityObject.user,
      objectName: fieldBody.name,
    }));
  }
  fields.push(formField({
    fieldName: OBJECT_FIELDS.PRODUCT_ID,
    objectName: fieldBody.name,
    user: datafinityObject.user,
    body: productIdBody,
  }));

  return {
    user: datafinityObject.user,
    importId: datafinityObject.importId,
    object_type: OBJECT_TYPES.PERSON,
    authority: datafinityObject.authority,
    fields,
    startAuthorPermlink: datafinityObject.author_permlink,
  };
};

const createFieldObject = async ({ field, datafinityObject }) => {
  const formObject = {
    authors: createPersonFromAuthors,
  };
  return formObject[field.name]({ field, datafinityObject });
};

const existConnectedAuthors = async ({ field }) => {
  const productIdBody = JSON.stringify({ productId: field.asin, productIdType: OBJECT_IDS.ASINS });
  const { wobject } = await Wobj.findOneByProductId(productIdBody, OBJECT_TYPES.PERSON);
  if (!wobject) return false;
  const fieldBody = parseJson(field.body, null);
  field.body = JSON.stringify({ name: fieldBody.name, authorPermlink: wobject.authorPermlink });
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

const specialFieldsHelper = async ({ datafinityObject, wobject }) => {
  const field = datafinityObject.fields[0];
  if (field.name === OBJECT_FIELDS.CATEGORY_ITEM) {
    const existingCategory = _.find(wobject.fields,
      (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === field.tagCategory);
    if (existingCategory) {
      field.id = existingCategory.id;
      return;
    }
    const id = uuid.v4();
    await addField({
      field: formField({
        fieldName: OBJECT_FIELDS.TAG_CATEGORY,
        locale: datafinityObject.locale,
        user: datafinityObject.user,
        body: field.tagCategory,
        id,
      }),
      wobject,
      importingAccount: datafinityObject.user,
      importId: datafinityObject.importId,
    });
    field.id = id;
  }
};

const validateSameFields = ({ fieldData, wobject }) => {
  const setUniqFields = ['name', 'body', 'locale'];

  const foundedFields = _.map(wobject.fields, (field) => _.pick(field, setUniqFields));
  const result = foundedFields.find((field) => _.isEqual(field, _.pick(fieldData, setUniqFields)));
  return !!result;
};

const processField = async ({ datafinityObject, wobject, user }) => {
  const exit = await checkFieldConnectedObject({ datafinityObject });
  if (exit) return;
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
