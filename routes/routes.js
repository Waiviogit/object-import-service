const express = require('express');
const {importWobjectsController} = require('../controllers');

const routes = express.Router();
const objects = express.Router();
routes.use('/import-objects-service', objects);

objects.route('/import-wobjects')
    .post(importWobjectsController.importWobjects);
objects.route('/import-tags')
    .post(importWobjectsController.importTags);


module.exports = routes;
