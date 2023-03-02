const fs = require('fs');
const { addWobjectsToQueue } = require('./importObjectsService');
const { uploadName, uploadPath } = require('../../constants/appData');

const FILE_PATH = `../../${uploadPath + uploadName}`;

const getWobjectsFromFile = (path) => {
  const json_data = fs.readFileSync(require('path').resolve(__dirname, path));
  const json = JSON.parse(json_data);

  if (Array.isArray(json)) {
    return { wobjects: json };
  }
  return { error: { status: 422, message: 'Wobjects format not correct!' } };
};

const removeFile = (path) => {
  fs.unlink(require('path').resolve(__dirname, path), (err) => {
    if (err) {
      console.error(err);
    }
    console.log(`${require('path').resolve(__dirname, path)} File deleted!`);
  });
};

const importWobjects = async () => {
  const { wobjects, error } = getWobjectsFromFile(FILE_PATH);

  if (error) {
    return { error };
  }
  await addWobjectsToQueue({ wobjects });
  console.log('Wobjects added to Queue');
  removeFile(FILE_PATH);
  return { result: true };
};

module.exports = { importWobjects };
