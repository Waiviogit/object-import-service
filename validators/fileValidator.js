const multer = require('multer');
const path = require('path');
const { uploadPath, uploadName } = require('../constants/appData');
const { ALLOWED_FILES_FORMATS } = require('../constants/fileFormats');

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    cb(null, uploadName);
  },
});
const fileFilter = (req, file, callback) => {
  const ext = path.extname(file.originalname);

  if (ext !== '.json') {
    return callback(new Error('File extension must be JSON'), null);
  }
  callback(null, true);
};

const textOrJsonFileFilter = (reg, file, cb) => {
  if (!file) return cb(new Error('Absent file'), null);

  const isFile = ALLOWED_FILES_FORMATS.find((item) => item === file.mimetype);

  if (!isFile) return cb(new Error('Incorrect file format'), null);

  return cb(null, true);
};

const memoryStorage = multer.memoryStorage();

exports.blobUpload = multer({ storage: memoryStorage });

exports.upload = multer({ storage, fileFilter });

exports.textOrJsonUpload = multer({ fieldname: 'file', fileFilter: textOrJsonFileFilter });
