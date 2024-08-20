const _ = require('lodash');
const uuid = require('uuid');
const {
  TagsStatusModel, TagsObjectModel, Wobj,
} = require('../../../models');
const { IMPORT_STATUS, IMPORT_TYPES } = require('../../../constants/appData');
const { validateImportToRun } = require('../../../validators/accountValidator');
const { sendUpdateImportForUser } = require('../socketClient');
const { addField } = require('../importObjectsService');
const { getObject } = require('../../waivioApi');
const { formField } = require('../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../constants/objectTypes');
const { gptTagsFromDescription } = require('../gptService');
const { LANGUAGES_SET } = require('../../../constants/wobjectsData');

const categoriesByType = {
  product: 'Pros',
  business: 'Pros',
  restaurant: 'Features',
  book: 'Tags',
  default: '',
};

const tagsCountNeeded = 10;

const prepareFields = async ({
  authorPermlink, importId, user, locale,
}) => {
  const { result: originalProcessed } = await getObject({ authorPermlink, locale });
  if (!originalProcessed) return;

  const fields = [];
  const categoryName = categoriesByType[originalProcessed.object_type] || categoriesByType.default;

  if (!originalProcessed.description || !categoryName) {
    await TagsObjectModel.updateOne({
      filter: {
        importId,
        authorPermlink,
      },
      update: {
        fields,
        fieldsCreated: true,
      },
    });
    return;
  }

  let category = _.find(originalProcessed.tagCategory, (el) => el.body === categoryName);

  if (!category) {
    category = formField({
      fieldName: OBJECT_FIELDS.TAG_CATEGORY,
      body: categoryName,
      user,
      locale,
      id: uuid.v4(),
    });
    fields.push(category);
  }

  const itemsLength = category?.items?.length ?? 0;
  const itemsNames = _.map(category?.items, (el) => el.body);
  if (itemsLength >= 10) {
    await TagsObjectModel.updateOne({
      filter: {
        importId,
        authorPermlink,
      },
      update: {
        fields,
        fieldsCreated: true,
      },
    });
    return;
  }

  const language = locale === 'en-US'
    ? ''
    : LANGUAGES_SET[locale] || '';

  const { result, error } = await gptTagsFromDescription({
    content: originalProcessed.description, createdTags: itemsNames, language,
  });
  if (error) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    createTags({ importId, user });
    return;
  }

  const { result: objects } = await Wobj.find({ filter: { author_permlink: { $in: result } } });
  if (!objects?.length) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    createTags({ importId, user });
    return;
  }
  const tags = _.take(
    _.difference(_.map(objects, (el) => el.author_permlink), itemsNames),
    tagsCountNeeded - itemsLength,
  );

  for (const tag of tags) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      body: tag,
      user,
      tagCategory: category.body,
      id: category.id,
      locale,
    }));
  }

  await TagsObjectModel.updateOne({
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

const rewriteFields = async ({ importId, user, locale }) => {
  const { result } = await TagsObjectModel.findOne({
    filter: {
      importId,
      processed: false,
    },
  });

  if (!result) return;
  if (!result?.fieldsCreated) {
    await prepareFields({
      authorPermlink: result.authorPermlink, importId, user, locale,
    });
    createTags({ importId, user });
    return;
  }

  const { result: wobject } = await Wobj.findOne({
    filter: { author_permlink: result.authorPermlink },
  });

  const alreadyProcessed = result?.fieldsCreated && !result.fields.length;

  if (result.fields[0]) {
    await addField({
      field: result.fields[0],
      wobject,
      importingAccount: user,
      importId,
    });
  }

  const conditionForProcessed = result.fields.length === 1 || !result.fields.length;

  await TagsObjectModel.updateOne({
    filter: { _id: result._id },
    update: {
      $pop: { fields: -1 },
      ...(conditionForProcessed && { processed: true }),
    },
  });

  if (conditionForProcessed && !alreadyProcessed) {
    await TagsStatusModel.updateOne({
      filter: { importId },
      update: {
        $inc: { objectsUpdated: 1 },
      },
    });
    await sendUpdateImportForUser({ account: user });
  }

  if (!alreadyProcessed) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  createTags({ importId, user });
};

const checkFieldsToCreate = async ({ importId }) => {
  const { count } = await TagsObjectModel.count({
    filter: {
      importId,
      processed: false,
    },
  });

  return !!count;
};

const createTags = async ({ importId, user }) => {
  const importStatus = await TagsStatusModel.getUserImport({ user, importId });
  if (!importStatus) return;
  if (importStatus.status !== IMPORT_STATUS.ACTIVE) return;

  const validImport = await validateImportToRun({
    user, importId, type: IMPORT_TYPES.TAGS,
  });
  if (!validImport) return;

  const createFields = await checkFieldsToCreate({ importId });
  if (createFields) {
    return rewriteFields({ importId, user, locale: importStatus.locale });
  }

  await TagsStatusModel.updateOne({
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

module.exports = createTags;
