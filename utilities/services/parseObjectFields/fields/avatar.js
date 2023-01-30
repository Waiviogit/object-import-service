const _ = require('lodash');
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { IMAGE_SIZE } = require('../../../../constants/fileFormats');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

const requestTimeout = 5000;

const loadImageByUrl = async (url, size) => {
  try {
    const bodyFormData = new FormData();

    bodyFormData.append('imageUrl', url);
    if (size) {
      bodyFormData.append('size', size);
    }
    const resp = await axios.post(
      process.env.SAVE_IMAGE_URL,
      bodyFormData,
      {
        headers: bodyFormData.getHeaders(),
        timeout: requestTimeout,
      },
    );
    const result = _.get(resp, 'data.image');
    if (!result) return { error: new Error('Internal server error') };
    return { result };
  } catch (error) {
    console.error(error.message);
    return { error };
  }
};

const checkImageHelper = async (image) => {
  try {
    const response = await axios.get(image, {
      timeout: requestTimeout,
    });
    return response.status === 200;
  } catch (error) {
    console.error(error.message);
    return false;
  }
};

module.exports = async (object) => {
  const images = _.uniq(_.concat(object.primaryImageURLs, object.imageURLs));
  if (_.isEmpty(images)) return;
  const fields = [];
  let sliceStart = 1;

  for (const [index, image] of images.entries()) {
    const validImage = await checkImageHelper(image);
    if (!validImage) continue;
    const { result, error } = await loadImageByUrl(image, IMAGE_SIZE.CONTAIN);
    if (error) continue;

    fields.push(formField({
      fieldName: OBJECT_FIELDS.AVATAR,
      locale: object.locale,
      user: object.user,
      body: result,
    }));
    sliceStart = index + 1;
    break;
  }
  if (_.isEmpty(fields)) return;

  const imagesForGallery = _.slice(images, sliceStart);
  if (_.isEmpty(imagesForGallery)) return fields;

  for (const imagesForGalleryElement of imagesForGallery) {
    const validImage = await checkImageHelper(imagesForGalleryElement);
    if (!validImage) continue;
    const httpsStart = /^https:/.test(imagesForGalleryElement);
    if (!httpsStart) continue;

    let album = _.find(fields, (f) => f.name === OBJECT_FIELDS.GALLERY_ALBUM);
    if (!album) {
      album = formField({
        fieldName: OBJECT_FIELDS.GALLERY_ALBUM,
        body: 'Photos',
        user: object.user,
        locale: object.locale,
        id: uuid.v4(),
      });
      fields.push(album);
    }

    fields.push(formField({
      fieldName: OBJECT_FIELDS.GALLERY_ITEM,
      body: imagesForGalleryElement,
      user: object.user,
      locale: object.locale,
      id: album.id,
    }));
  }

  return fields;
};
