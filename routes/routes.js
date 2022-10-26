const express = require('express');
const { importWobjectsController } = require('../controllers');
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

module.exports = routes;
