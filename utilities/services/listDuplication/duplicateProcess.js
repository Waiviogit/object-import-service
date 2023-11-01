const _ = require('lodash');
const {
  DuplicateListObjectModel,
  ObjectType,
  DuplicateListStatusModel,
  Wobj,
} = require('../../../models');
const {
  OBJECT_TYPES, OBJECT_FIELDS, ARRAY_FIELDS, ARRAY_FIELDS_BODY, FIELDS_TO_REWRITE_GPT,
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
const { gptCreateCompletion } = require('../gptService');

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
    filter: { importId, user },
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
    filter: { _id: result._id },
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

const promptsByFieldName = {
  name: 'rewrite name of a product',
  title: 'Using your best SEO and copywriting skills, rephrase the title',
  description: 'rewrite description  seo friendly, act as a professional copywriter and seo expert, 3 paragraph max',
};

const rewriteBodyWithGpt = async ({ objectType, field }) => {
  if (!FIELDS_TO_REWRITE_GPT.includes(field.name)) return field.body;

  if (objectType === OBJECT_TYPES.LIST && field.name === OBJECT_FIELDS.NAME) {
    return field.body;
  }
  if (objectType === OBJECT_TYPES.PRODUCT && field.name === OBJECT_FIELDS.TITLE) {
    return field.body;
  }
  const prompt = `${promptsByFieldName[objectType]}: ${field.body}`;

  const { result, error } = await gptCreateCompletion({
    content: prompt,
  });

  if (!result || error) return field.body;

  return result;
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
      const fieldBody = await rewriteBodyWithGpt({
        objectType: original.object_type,
        field,
      });

      fields.push(formField({
        fieldName: field.name,
        body: fieldBody,
        user,
        locale: field.locale,
      }));
      continue;
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
      continue;
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
      continue;
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
      continue;
    }
    if (field.name === 'parent') {
      const sameParent = originalProcessed?.parent?.author_permlink === field.body;
      if (sameParent) {
        const { result } = await DuplicateListObjectModel.findOne({
          filter: {
            importId,
            linkToDuplicate: field.body,
          },
        });

        const body = result?.authorPermlink
          ? result?.authorPermlink
          : field.body;

        fields.push(formField({
          fieldName: field.name,
          body,
          user,
          locale: field.locale,
        }));
      }
      continue;
    }

    if (field.name === OBJECT_FIELDS.CATEGORY_ITEM) {
      const hasMatchingItem = (originalProcessed?.tagCategory ?? [])
        .some((item) => item.items
          .some((subItem) => subItem.author === field.author
              && subItem.permlink === field.permlink));
      if (hasMatchingItem) {
        fields.push(formField({
          fieldName: field.name,
          body: field.body,
          user,
          locale: field.locale,
          id: field.id,
        }));
      }
      continue;
    }

    if (ARRAY_FIELDS.includes(field.name)) {
      const arrItem = originalProcessed[field.name]?.find(
        (f) => f.author === field.author && f.permlink === field.permlink,
      );
      if (arrItem) {
        fields.push(formField({
          fieldName: field.name,
          body: field.body,
          user,
          locale: field.locale,
          ...(field.name === OBJECT_FIELDS.TAG_CATEGORY && { id: field.id }),
        }));
      }
    }
  }

  fields.push(formField({
    fieldName: 'authority',
    body: 'administrative',
    user,
    locale: 'en-US',
  }));

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
      ...(result.fields.length === 1 && { processed: true, voted: true }),
    },
  });
  await sendUpdateImportForUser({ account: user });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  duplicateProcess({ importId, user });
};

const prepareFieldsForVote = async ({ linkToDuplicate, importId, user }) => {
  const { result: original } = await Wobj.findOne({
    filter: { author_permlink: linkToDuplicate },
  });
  const { result: originalProcessed } = await getObject({ authorPermlink: linkToDuplicate });

  if (!original || !originalProcessed) return;
  const fields = [];

  for (const field of original.fields) {
    if (field.name === OBJECT_FIELDS.AUTHORITY) continue;
    const positiveVote = field?.active_votes?.find((v) => v.voter === user && v.percent > 0);
    if (positiveVote) continue;

    const { author, permlink } = field;
    const processed = originalProcessed[field.name] === field.body;
    if (processed) {
      fields.push({ author, permlink });
      continue;
    }
    if (field.name === OBJECT_FIELDS.OPTIONS) {
      for (const option in originalProcessed.options) {
        const el = originalProcessed.options[option]
          ?.find((f) => f.author === field.author && f.permlink === field.permlink);
        if (el) {
          fields.push({ author, permlink });
        }
      }
      continue;
    }
    if (field.name === OBJECT_FIELDS.CATEGORY_ITEM) {
      const hasMatchingItem = (originalProcessed?.tagCategory ?? [])
        .some((item) => item.items
          .some((subItem) => subItem.author === field.author
                  && subItem.permlink === field.permlink));
      if (hasMatchingItem) {
        fields.push({ author, permlink });
      }
      continue;
    }
    if (ARRAY_FIELDS_BODY.includes(field.name)) {
      const el = originalProcessed[field.name]?.find((f) => f === field.body);
      if (el) {
        fields.push({ author, permlink });
      }
      continue;
    }
    if (ARRAY_FIELDS.includes(field.name)) {
      const item = originalProcessed
        ?.[field.name]
        ?.find((f) => f.author === field.author && f.permlink === field.permlink);
      if (item) {
        fields.push({ author, permlink });
      }
      continue;
    }

    if (field.name === 'sortCustom') {
      const json = parseJson(field.body);
      if (_.isEqual(json, originalProcessed?.sortCustom)) {
        fields.push({ author, permlink });
      }
      continue;
    }

    if (field.name === 'parent') {
      const sameParent = originalProcessed?.parent?.author_permlink === field.body;
      if (sameParent) fields.push({ author, permlink });
    }
  }
  if (!fields.length) {
    await DuplicateListObjectModel.updateOne({
      filter: {
        importId,
        linkToDuplicate,
      },
      update: {
        voted: true,
      },
    });
    duplicateProcess({ importId, user });
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
    filter: { author_permlink: result.linkToDuplicate },
  });

  if (!wobject) return;
  if (!result?.fields?.length) {
    await prepareFieldsForVote({
      linkToDuplicate: result.linkToDuplicate,
      importId,
      user,
    });
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
      ...(result.fields.length === 1 && { voted: true }),
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
  const importStatus = await DuplicateListStatusModel.getUserImport({ user, importId });
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
  await DuplicateListStatusModel.updateOne({
    filter: {
      user,
      importId,
    },
    update: {
      status: IMPORT_STATUS.FINISHED,
      finishedAt: new Date(),
    },
  });
  await sendUpdateImportForUser({ account: user });
};

module.exports = duplicateProcess;
