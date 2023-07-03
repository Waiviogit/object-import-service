const Jimp = require('jimp');
const { promisify } = require('util');
const sizeOf = require('image-size');
const _ = require('lodash');
const axios = require('axios');

const timeout = (ms) => new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error(`Timed out in ${ms}ms.`));
  }, ms);
});

const jimpReadImage = async ({ imageUrl, timeoutMs }) => {
  try {
    const result = await Promise.race([Jimp.read(imageUrl), timeout(timeoutMs)]);
    return {
      result: {
        width: _.get(result, 'bitmap.width'),
        height: _.get(result, 'bitmap.height'),
      },
    };
  } catch (error) {
    return { error };
  }
};

const getBase64 = async ({ imageUrl, timeoutMs }) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: timeoutMs });
    return {
      result: response.data,
    };
  } catch (error) {
    return { error };
  }
};

const sizeOfReadImage = async ({ imageUrl, timeoutMs }) => {
  try {
    const { result: buffer, error: bufferError } = await getBase64({ imageUrl, timeoutMs });
    if (bufferError) return { error: bufferError };
    const result = sizeOf(buffer);

    return {
      result,
    };
  } catch (error) {
    return { error };
  }
};

const isProperResolution = async (imageUrl) => {
  const minResolution = 250;
  const { result, error } = await sizeOfReadImage({ imageUrl, timeoutMs: 5000 });
  if (error) {
    return;
  }
  const width = _.get(result, 'width');
  const height = _.get(result, 'height');
  if (width < minResolution || height < minResolution) return;
  return true;
};

module.exports = {
  isProperResolution,
};
