const {
  ImportStatusModel,
  AuthorityStatusModel,
  DepartmentsStatusModel,
  DuplicateListStatusModel,
  DescriptionStatusModel,
  TagsStatusModel,
  RecipeGenerationStatusModel,
  ThreadStatusModel,
  PostStatusModel,
} = require('../../models');
const { startObjectImport } = require('../services/objectsImport/importDatafinityObjects');
const { IMPORT_STATUS } = require('../../constants/appData');
const claimProcess = require('../services/authority/claimProcess');
const importDepartments = require('../services/departmentsService/importDepartments');
const duplicateProcess = require('../services/listDuplication/duplicateProcess');
const rewriteDescription = require('../services/descriptionBot/rewriteDescription');
const createTags = require('../services/tagsBot/createTags');
const { generateRecipeAndImage } = require('../services/recipeGeneration/recipeGeneration');
const threadMessage = require('../services/groupMessageThread/threadMessage');
const importPost = require('../services/postsBot/postImport');

const tasksToRun = [
  {
    model: ImportStatusModel,
    processStarter: startObjectImport,
  },
  {
    model: AuthorityStatusModel,
    processStarter: claimProcess,
  },
  {
    model: DepartmentsStatusModel,
    processStarter: importDepartments,
  },

  {
    model: DuplicateListStatusModel,
    processStarter: duplicateProcess,
  },
  {
    model: DescriptionStatusModel,
    processStarter: rewriteDescription,
  },
  {
    model: TagsStatusModel,
    processStarter: createTags,
  },
  {
    model: RecipeGenerationStatusModel,
    processStarter: generateRecipeAndImage,
  },
  {
    model: ThreadStatusModel,
    processStarter: threadMessage,
  },
  {
    model: PostStatusModel,
    processStarter: importPost,
  },
];

module.exports = async () => {
  for (const task of tasksToRun) {
    const { result } = await task.model.find({
      filter: { status: IMPORT_STATUS.ACTIVE },
    });
    for (const resultElement of result) {
      const { user, importId } = resultElement;
      task.processStarter({ user, importId });
    }
  }
};
