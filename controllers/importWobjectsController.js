const validators = require('controllers/validators');
const {
  importObjectsService, importTagsService, importObjectsFromFile, importDatafinityObjects,
} = require('../utilities/services');
const { validateImmediatelyImport } = require('../utilities/objectBotApi/validators');
const { FILE_MAX_SIZE } = require('../constants/fileFormats');
const { authorise } = require('../utilities/authorization/authorizeUser');

const importWobjects = async (req, res, next) => {
  const data = {
    wobjects: req.body.wobjects || [],
    immediately: req.body.immediately || false,
  };
  const validateImmediately = validateImmediatelyImport(req);

  if (!validateImmediately) {
    return next({ status: 422, message: 'Not enough data in immediately request!' });
  }
  await importObjectsService.addWobjectsToQueue(data);
  console.log('wobjects added to queue');
  res.status(200).json({ message: 'Wobjects added to queue of creating!' });
}; // add wobjects to queue for send it to objects-bot and write it to blockchain

const importTags = async (req, res, next) => {
  const tags = req.body.tags || [];

  await importTagsService.importTags({ tags });
  res.status(200).json({ message: 'Wobjects by tags added to queue of creating' });
};

const importWobjectsJson = async (req, res, next) => {
  const { result, error } = await importObjectsFromFile.importWobjects();

  if (error) {
    return next(error);
  }
  res.status(200).json({ message: 'Wobjects added to queue of creating!' });
};

const importObjectsFromTextOrJson = async (req, res, next) => {
  if (req.file.size > FILE_MAX_SIZE) {
    return next({ error: { status: 422, message: 'Allowed file size must be less than 100 MB' } });
  }

  const value = validators.validate(
    { ...req.body },
    validators.importWobjects.importDatafinityObjectsSchema,
    next,
  );

  if (!value) return;

  const accessToken = req.headers['access-token'];
  const { error: authError } = await authorise(value.user, accessToken);

  if (authError) return next(authError);

  const { result, error } = await importDatafinityObjects.importObjects({ file: req.file, ...value });

  if (error) {
    return next(error);
  }

  res.status(200).json({ message: 'Objects added to queue of creating!' });
};

module.exports = {
  importWobjects,
  importTags,
  importWobjectsJson,
  importObjectsFromTextOrJson,
};
