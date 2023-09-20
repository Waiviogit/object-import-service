const _ = require('lodash');
const {
  DuplicateListObjectModel, ObjectType, DuplicateListStatusModel, Wobj, DatafinityObject, DepartmentsStatusModel,
} = require('../../../models');
const {
  OBJECT_TYPES, OBJECT_FIELDS, ARRAY_FIELDS, ARRAY_FIELDS_BODY,
} = require('../../../constants/objectTypes');
const { prepareObjectForImport } = require('../../helpers/importDatafinityHelper');
const { addWobject, addField } = require('../importObjectsService');
const { getObject } = require('../../waivioApi');
const { formField } = require('../../helpers/formFieldHelper');
const { parseJson } = require('../../helpers/jsonHelper');
const { voteForField } = require('../../objectBotApi');
const { IMPORT_STATUS, IMPORT_TYPES } = require('../../../constants/appData');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { sendUpdateImportForUser } = require('../socketClient');

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
  const { result: status } = await DuplicateListStatusModel.findOne({
    importId, user,
  });

  let filter = {
    importId,
    type: OBJECT_TYPES.LIST,
    duplicateCreated: false,
  };
  if (!status.lists.length) {
    filter = {
      importId,
      type: OBJECT_TYPES.LIST,
      linkToDuplicate: status.rootObject,
      duplicateCreated: false,
    };
  }

  const { result } = await DuplicateListObjectModel.findOne({ filter });
  if (!result) return;

  const wobject = await prepareObjectForImport({
    user,
    name: result.name,
    object_type: result.type,
  });

  const { objectType: existObjType } = await ObjectType
    .getOne({ name: wobject.object_type });

  console.log(wobject.author_permlink, 'creating duplicate object');
  wobject.importId = importId;
  await addWobject({ wobject, existObjType, addData: false });

  await DuplicateListObjectModel.updateOne({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
    },
    update: {
      $set: {
        duplicateCreated: true,
        authorPermlink: wobject.author_permlink,
      },
    },
  });

  let statusUpdate = {
    $inc: { objectsCreated: 1 },
  };

  if (!status.lists.length) {
    statusUpdate = {
      $inc: { objectsCreated: 1 },
      lists: [wobject.author_permlink],
    };
  }

  await DuplicateListStatusModel.updateOne({
    filter: { importId },
    update: statusUpdate,
  });
  await sendUpdateImportForUser({ account: user });
};

const checkFieldsToCreate = async ({ importId }) => {
  const { count } = await DuplicateListObjectModel.count({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
      processed: false,
    },
  });

  return !!count;
};

const checkFieldsToVote = async ({ importId }) => {
  const { count } = await DuplicateListObjectModel.count({
    filter: {
      importId,
      type: { $ne: OBJECT_TYPES.LIST },
      voted: false,
    },
  });

  return !!count;
};

const prepareFields = async ({
  linkToDuplicate, importId, user,
}) => {
  const { result: original } = await Wobj.findOne({
    filter: { author_permlink: linkToDuplicate },
  });
  const { result: originalProcessed } = await getObject({ authorPermlink: linkToDuplicate });

  if (!original || !originalProcessed) return;
  const fields = [];

  for (const field of original.fields) {
    const processed = originalProcessed[field.name] === field.body;
    if (processed) {
      fields.push(formField({
        fieldName: field.name,
        body: field.body,
        user,
        locale: field.locale,
      }));
    }
    if (['pin', 'remove'].includes(field.name)) {
      const pinOrRemove = originalProcessed[field.name]
        .find((f) => f.author === field.author && f.permlink === field.permlink);
      if (pinOrRemove) {
        fields.push(formField({
          fieldName: field.name,
          body: field.body,
          user,
          locale: field.locale,
        }));
      }
    }
    if (field.name === 'listItem') {
      const list = originalProcessed[field.name]
        .find((f) => f.author === field.author && f.permlink === field.permlink);
      if (list) {
        const { result: listDb } = await DuplicateListObjectModel.findOne({
          filter: {
            importId,
            linkToDuplicate: field.body,
          },
        });

        if (listDb) {
          const body = listDb.type === OBJECT_TYPES.LIST
            ? listDb.authorPermlink
            : listDb.linkToDuplicate;

          fields.push(formField({
            fieldName: field.name,
            body,
            user,
            locale: field.locale,
          }));
        }
      }
    }
    if (field.name === 'sortCustom') {
      const json = parseJson(field.body);
      if (_.isEqual(json, originalProcessed?.sortCustom)) {
        fields.push(formField({
          fieldName: field.name,
          body: field.body,
          user,
          locale: field.locale,
        }));
      }
    }
  }

  fields.push(
    fields.push(formField({
      fieldName: 'authority',
      body: 'administrative',
      user,
      locale: 'en-US',
    })),
  );
  await DuplicateListObjectModel.updateOne({
    filter: {
      importId,
      linkToDuplicate,
    },
    update: {
      fields,
    },
  });
};

const createDuplicateFields = async ({ importId, user }) => {
  const { result } = await DuplicateListObjectModel.findOne({
    filter: {
      importId,
      type: OBJECT_TYPES.LIST,
      processed: false,
    },
  });

  if (!result) return;
  if (!result?.fields?.length) {
    await prepareFields({ linkToDuplicate: result.linkToDuplicate, importId, user });
    duplicateProcess({ importId, user });
    return;
  }

  const { result: wobject } = await Wobj.findOne({
    filter: { author_permlink: result.authorPermlink },
  });

  await addField({
    field: result.fields[0],
    wobject,
    importingAccount: user,
    importId,
  });
  await DuplicateListStatusModel.updateOne({
    filter: { importId },
    update: {
      $inc: {
        fieldsCreated: 1,
        fieldsVoted: 1,
      },
    },
  });
  await DuplicateListObjectModel.updateOne({
    filter: { _id: result._id },
    update: {
      $pop: { fields: -1 },
      $inc: {
        fieldsCreated: 1,
        fieldsVoted: 1,
      },
      ...(result.fields.length === 1 && { processed: true }),
    },
  });
  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  duplicateProcess({ importId, user });
};

const prepareFieldsForVote = async ({ linkToDuplicate, importId }) => {
  const { result: original } = await Wobj.findOne({
    filter: { author_permlink: linkToDuplicate },
  });
  const { result: originalProcessed } = await getObject({ authorPermlink: linkToDuplicate });

  if (!original || !originalProcessed) return;
  const fields = [];

  for (const field of original.fields) {
    if (field.name === OBJECT_FIELDS.AUTHORITY) continue;
    const { author, permlink } = field;
    const processed = originalProcessed[field.name] === field.body;
    if (processed) {
      fields.push({ author, permlink });
    }
    if (ARRAY_FIELDS.includes(field.name)) {
      const item = originalProcessed[field.name]?.find((f) => f.author === field.author && f.permlink === field.permlink);
      if (item) {
        fields.push({ author, permlink });
      }
      if (field.name === OBJECT_FIELDS.OPTIONS) {
        for (const option in originalProcessed.options) {
          const el = originalProcessed.options[option]
            ?.find((f) => f.author === field.author && f.permlink === field.permlink);
          if (el) {
            fields.push({ author, permlink });
          }
        }
      }
      if (ARRAY_FIELDS_BODY.includes(field.name)) {
        const el = originalProcessed[field.name]?.find((f) => f === field.body);
        if (el) {
          fields.push({ author, permlink });
        }
      }
    }

    if (field.name === 'sortCustom') {
      const json = parseJson(field.body);
      if (_.isEqual(json, originalProcessed?.sortCustom)) {
        fields.push({ author, permlink });
      }
    }
  }

  await DuplicateListObjectModel.updateOne({
    filter: {
      importId,
      linkToDuplicate,
    },
    update: {
      fields,
    },
  });
};

const voteForFields = async ({ importId, user }) => {
  const { result } = await DuplicateListObjectModel.findOne({
    filter: {
      importId,
      type: { $ne: OBJECT_TYPES.LIST },
      voted: false,
    },
  });
  if (!result) return;

  const { result: wobject } = await Wobj.findOne({
    filter: { author_permlink: result.authorPermlink },
  });

  if (!result) return;
  if (!result?.fields?.length) {
    await prepareFieldsForVote({ linkToDuplicate: result.linkToDuplicate, importId });
    duplicateProcess({ importId, user });
    return;
  }

  const field = result.fields[0];

  await voteForField.send({
    voter: user,
    authorPermlink: wobject.author_permlink,
    author: field.author,
    permlink: field.permlink,
    fieldType: OBJECT_FIELDS.DEPARTMENTS,
  });

  await DuplicateListStatusModel.updateOne({
    filter: { importId },
    update: {
      $inc: {
        fieldsVoted: 1,
      },
    },
  });
  await DuplicateListObjectModel.updateOne({
    filter: { _id: result._id },
    update: {
      $pop: { fields: -1 },
      $inc: {
        fieldsVoted: 1,
      },
      ...(result.fields.length === 1 && { processed: true }),
    },
  });
  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  duplicateProcess({ importId, user });
};

const checkAuthorityFields = async ({ importId }) => {
  const { count } = await DuplicateListObjectModel.count({
    filter: {
      importId,
      type: { $ne: OBJECT_TYPES.LIST },
      processed: false,
    },
  });

  return !!count;
};

const createAuthorityFields = async ({ importId, user }) => {
  const { result } = await DuplicateListObjectModel.findOne({
    filter: {
      importId,
      type: { $ne: OBJECT_TYPES.LIST },
      processed: false,
    },
  });
  if (!result) return;

  const { result: wobject } = await Wobj.findOne({
    filter: { author_permlink: result.linkToDuplicate },
  });

  const authority = wobject.fields.find((f) => f.name === OBJECT_FIELDS.AUTHORITY && f.creator === user);
  if (!authority) {
    await addField({
      field: formField({
        fieldName: 'authority',
        body: 'administrative',
        user,
        locale: 'en-US',
      }),
      wobject,
      importingAccount: user,
      importId,
    });
  }

  await DuplicateListStatusModel.updateOne({
    filter: { importId },
    update: {
      $inc: {
        fieldsCreated: 1,
        fieldsVoted: 1,
      },
    },
  });
  await DuplicateListObjectModel.updateOne({
    filter: { _id: result._id },
    update: {
      $inc: {
        fieldsCreated: 1,
        fieldsVoted: 1,
      },
      processed: true,
    },
  });

  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  duplicateProcess({ importId, user });
};

const duplicateProcess = async ({ importId, user }) => {
  const importStatus = await DepartmentsStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({
    user, importId, type: IMPORT_TYPES.DUPLICATE,
  });
  if (!validImport) return;

  const createObject = await checkObjectsToCreate({ importId });
  if (createObject) {
    return createDuplicateObject({ importId, user });
  }

  const createFields = await checkFieldsToCreate({ importId });
  if (createFields) {
    return createDuplicateFields({ importId, user });
  }

  const authorityFields = await checkAuthorityFields({ importId });
  if (authorityFields) {
    return createAuthorityFields({ importId, user });
  }

  const fieldsToVote = await checkFieldsToVote({ importId });
  if (fieldsToVote) {
    return voteForFields({ importId, user });
  }
  await DepartmentsStatusModel.updateOne({
    filter: {
      user,
      importId,
    },
    update: {
      status: IMPORT_STATUS.FINISHED,
    },
  });
  await sendUpdateImportForUser({ account: user });
};

module.exports = duplicateProcess;