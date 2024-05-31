const _ = require('lodash');
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { IMAGE_SIZE } = require('../../../../constants/fileFormats');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { isProperResolution } = require('../../../helpers/imageHelper');

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
        timeout: 15000,
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

const checkForDuplicates = async (urls = []) => {
  try {
    const url = process.env.IMAGE_CHECK_URL || 'http://localhost:8022/images-hash-filter';
    const response = await axios.post(
      url,
      {
        urls,
      },
      {
        timeout: 15000,
      },
    );
    return _.get(response, 'data.result');
  } catch (error) {
    return urls;
  }
};

module.exports = async (object) => {
  const fields = [];
  let loadAvatar = true;
  if (object.primaryImageURLs && object.primaryImageURLs.length === 1) {
    const sephoraImage = /sephora.com/.test(object.primaryImageURLs[0]);
    if (sephoraImage) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.AVATAR,
        locale: object.locale,
        user: object.user,
        body: object.primaryImageURLs[0],
      }));
    } else {
      const validImage = await isProperResolution(object.primaryImageURLs[0]);
      if (validImage) {
        const { result } = await loadImageByUrl(
          object.primaryImageURLs[0],
          IMAGE_SIZE.CONTAIN,
        );
        if (result) {
          fields.push(formField({
            fieldName: OBJECT_FIELDS.AVATAR,
            locale: object.locale,
            user: object.user,
            body: result,
          }));
          loadAvatar = false;
        }
      }
    }
  }

  const imagesWithOkResolution = [];
  const elementsToCheck = [];
  if (loadAvatar) elementsToCheck.push(...(object?.primaryImageURLs ?? []));
  elementsToCheck.push(...object?.imageURLs ?? []);

  for (const element of _.uniq(elementsToCheck)) {
    const sephoraImage = /sephora.com/.test(element);
    const waivioImage = /waivio.nyc3.digitaloceanspaces.com/.test(element);
    if (sephoraImage || waivioImage) {
      imagesWithOkResolution.push(element);
      continue;
    }

    const validImage = await isProperResolution(element);
    if (!validImage) continue;
    imagesWithOkResolution.push(element);
  }

  if (_.isEmpty(imagesWithOkResolution)) return fields.length ? fields : null;

  const images = await checkForDuplicates(imagesWithOkResolution);
  if (_.isEmpty(images)) {
    images.push(...imagesWithOkResolution);
  }

  let sliceStart = 1;

  for (const [index, image] of images.entries()) {
    if (!loadAvatar) break;
    const { result, error } = await loadImageByUrl(image, IMAGE_SIZE.CONTAIN);
    if (error) {
      await new Promise((r) => setTimeout(r, 3000));
      const { result: secondTry, error: secondErr } = await loadImageByUrl(
        image,
        IMAGE_SIZE.CONTAIN,
      );
      if (secondErr) continue;
      fields.push(formField({
        fieldName: OBJECT_FIELDS.AVATAR,
        locale: object.locale,
        user: object.user,
        body: secondTry,
      }));
      sliceStart = index + 1;
      break;
    }

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
