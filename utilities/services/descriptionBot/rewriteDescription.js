const {
  DescriptionStatusModel,
  DescriptionObjectModel,
  Wobj,
} = require('../../../models');
const {
  OBJECT_TYPES, OBJECT_FIELDS, FIELDS_TO_REWRITE_GPT,
} = require('../../../constants/objectTypes');

const { addField } = require('../importObjectsService');
const { getObject } = require('../../waivioApi');
const { formField } = require('../../helpers/formFieldHelper');
const { IMPORT_STATUS, IMPORT_TYPES } = require('../../../constants/appData');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { sendUpdateImportForUser } = require('../socketClient');
const { gptCreateCompletion } = require('../gptService');
const { removeQuotes } = require('../../helpers/stringFormatHelper');

const checkFieldsToCreate = async ({ importId }) => {
  const { count } = await DescriptionObjectModel.count({
    filter: {
      importId,
      processed: false,
    },
  });

  return !!count;
};

const promptsByFieldName = {
  name: 'rewrite name of a product',
  title: 'Using your best SEO and copywriting skills, help me formulate an engaging title, max 250 symbols. Here\'s the original for reference',
  description: 'rewrite description  seo friendly, act as a professional copywriter and seo expert, 3 paragraph max',
};

const rewriteBodyWithGpt = async ({ objectType, field }) => {
  if (!FIELDS_TO_REWRITE_GPT.includes(field.name)) return '';

  if (objectType === OBJECT_TYPES.LIST && field.name === OBJECT_FIELDS.NAME) {
    return '';
  }
  if (objectType === OBJECT_TYPES.PRODUCT && field.name === OBJECT_FIELDS.TITLE) {
    return '';
  }
  const prompt = `${promptsByFieldName[field.name]}: ${field.body}`;

  const { result, error } = await gptCreateCompletion({
    content: prompt,
  });

  if (!result || error) return '';

  return removeQuotes(result);
};

const prepareFields = async ({
  authorPermlink, importId, user,
}) => {
  const { result: original } = await Wobj.findOne({
    filter: { author_permlink: authorPermlink },
  });
  const { result: originalProcessed } = await getObject({ authorPermlink });

  if (!original || !originalProcessed) return;

  const originalFields = original.fields
    .filter((el) => FIELDS_TO_REWRITE_GPT.includes(el.name));

  const fields = [];

  const fieldsCreatedByUser = originalFields.filter((el) => el.creator === user);

  for (const field of originalFields) {
    const processed = originalProcessed[field.name] === field.body;

    if (processed) {
      const userExistField = fieldsCreatedByUser.find((el) => el.name === field.name);
      if (userExistField) continue;

      const fieldBody = await rewriteBodyWithGpt({
        objectType: original.object_type,
        field,
      });

      if (!fieldBody) continue;

      fields.push(formField({
        fieldName: field.name,
        body: fieldBody,
        user,
        locale: field.locale,
      }));
    }
  }

  await DescriptionObjectModel.updateOne({
    filter: {
      importId,
      authorPermlink,
    },
    update: {
      fields,
      fieldsCreated: true,
    },
  });
};

const rewriteFields = async ({ importId, user }) => {
  const { result } = await DescriptionObjectModel.findOne({
    filter: {
      importId,
      processed: false,
    },
  });

  if (!result) return;
  if (!result?.fieldsCreated) {
    await prepareFields({ authorPermlink: result.authorPermlink, importId, user });
    rewriteDescription({ importId, user });
    return;
  }

  const { result: wobject } = await Wobj.findOne({
    filter: { author_permlink: result.authorPermlink },
  });

  if (result.fields[0]) {
    await addField({
      field: result.fields[0],
      wobject,
      importingAccount: user,
      importId,
    });
  }

  const conditionForProcessed = result.fields.length === 1 || !result.fields.length;

  await DescriptionObjectModel.updateOne({
    filter: { _id: result._id },
    update: {
      $pop: { fields: -1 },
      ...(conditionForProcessed && { processed: true }),
    },
  });

  if (conditionForProcessed) {
    await DescriptionStatusModel.updateOne({
      filter: { importId },
      update: {
        $inc: { objectsUpdated: 1 },
      },
    });
    await sendUpdateImportForUser({ account: user });
  }

  await new Promise((resolve) => setTimeout(resolve, 4000));

  rewriteDescription({ importId, user });
};

const rewriteDescription = async ({ importId, user }) => {
  const importStatus = await DescriptionStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({
    user, importId, type: IMPORT_TYPES.DESCRIPTION,
  });
  if (!validImport) return;

  const createFields = await checkFieldsToCreate({ importId });
  if (createFields) {
    return rewriteFields({ importId, user });
  }

  await DescriptionStatusModel.updateOne({
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

module.exports = rewriteDescription;
