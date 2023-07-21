const express = require('express');
const { importWobjectsController, authorityController } = require('../controllers');
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

module.exports = routes;
