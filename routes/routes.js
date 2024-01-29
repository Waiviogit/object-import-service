const express = require('express');
const {
  importWobjectsController,
  authorityController,
  importDepartmentsController,
  duplicateListController,
  descriptionBotController,
} = require('../controllers');
const { upload, textOrJsonUpload } = require('../validators/fileValidator');

const routes = express.Router();
const objects = express.Router();

routes.use('/import-objects-service', objects);

objects.route('/import-wobjects')
  .post(importWobjectsController.importWobjects);
objects.route('/import-tags')
  .post(importWobjectsController.importTags);
objects.route('/import-wobjects-json')
  .post(upload.single('wobjects'), importWobjectsController.importWobjectsJson);

objects.route('/import-products')
  .post(
    textOrJsonUpload.single('file'),
    importWobjectsController.importObjectsFromTextOrJson,
  )
  .get(importWobjectsController.getImportStatistic)
  .put(importWobjectsController.changeImportDetails)
  .delete(importWobjectsController.deleteImport);
objects.route('/import-products/history')
  .get(importWobjectsController.getImportHistory);
objects.route('/import-products/power')
  .get(importWobjectsController.getVotingPower)
  .put(importWobjectsController.setVotingPower);
objects.route('/asins-not-published')
  .post(importWobjectsController.getNotPublished);
objects.route('/gpt-query')
  .post(importWobjectsController.gptQuery);

objects.route('/authority')
  .post(authorityController.claimAuthority)
  .get(authorityController.getImportStatistic)
  .put(authorityController.changeImportDetails)
  .delete(authorityController.deleteImport);
objects.route('/authority/objects')
  .post(authorityController.getObjectDetails);
objects.route('/authority/power')
  .get(authorityController.getVotingPower)
  .put(authorityController.setVotingPower);
objects.route('/authority/history')
  .get(authorityController.getImportHistory);

objects.route('/departments')
  .post(importDepartmentsController.importDepartments)
  .get(importDepartmentsController.getImportStatistic)
  .put(importDepartmentsController.changeImportDetails)
  .delete(importDepartmentsController.deleteImport);
objects.route('/departments/objects')
  .post(importDepartmentsController.getObjectDetails);
objects.route('/departments/power')
  .get(importDepartmentsController.getVotingPower)
  .put(importDepartmentsController.setVotingPower);
objects.route('/departments/history')
  .get(importDepartmentsController.getImportHistory);

objects.route('/duplicate-list')
  .post(duplicateListController.duplicateList)
  .get(duplicateListController.getImportStatistic)
  .put(duplicateListController.changeImportDetails)
  .delete(duplicateListController.deleteImport);
objects.route('/duplicate-list/objects')
  .post(duplicateListController.getObjectDetails);
objects.route('/duplicate-list/power')
  .get(duplicateListController.getVotingPower)
  .put(duplicateListController.setVotingPower);
objects.route('/duplicate-list/history')
  .get(duplicateListController.getImportHistory);

objects.route('/description-bot')
  .post(descriptionBotController.rewriteDescription)
  .get(descriptionBotController.getImportStatistic)
  .put(descriptionBotController.changeImportDetails)
  .delete(descriptionBotController.deleteImport);
objects.route('/description-bot/objects')
  .post(descriptionBotController.getObjectDetails);
objects.route('/description-bot/power')
  .get(descriptionBotController.getVotingPower)
  .put(descriptionBotController.setVotingPower);
objects.route('/description-bot/history')
  .get(descriptionBotController.getImportHistory);

module.exports = routes;
