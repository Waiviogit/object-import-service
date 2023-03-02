const Jimp = require('jimp');
const _ = require('lodash');

const timeout = (ms) => new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error(`Timed out in ${ms}ms.`));
  }, ms);
});

const jimpReadImage = async ({ imageUrl, timeoutMs }) => {
  try {
    const result = await Promise.race([Jimp.read(imageUrl), timeout(timeoutMs)]);
    return { result };
  } catch (error) {
    return { error };
  }
};

const isProperResolution = async (imageUrl) => {
  const minResolution = 300;
  const { result, error } = await jimpReadImage({ imageUrl, timeoutMs: 5000 });
  if (error) return;
  const width = _.get(result, 'bitmap.width');
  const height = _.get(result, 'bitmap.height');
  if (width < minResolution || height < minResolution) return;
  return true;
};

module.exports = {
  isProperResolution,
};
