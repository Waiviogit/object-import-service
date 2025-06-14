const _ = require('lodash');
const axios = require('axios');
const { IMAGE_SIZE } = require('../../../../constants/fileFormats');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { isProperResolution, loadImageByUrl } = require('../../../helpers/imageHelper');
const { createUUID } = require('../../../helpers/cryptoHelper');

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

const mapProtocolRelativeUrls = (link = '') => {
  if (link.startsWith('//')) return `https:${link}`;
  return link;
};

const avatar = async (object) => {
  // check protocol-relative URLs
  if (object?.primaryImageURLs?.length) {
    object.primaryImageURLs = object.primaryImageURLs.map(mapProtocolRelativeUrls);
  }

  if (object?.imageURLs?.length) {
    object.imageURLs = object.imageURLs.map(mapProtocolRelativeUrls);
  }

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

  const imagesForGallery = loadAvatar ? _.slice(images, sliceStart) : images;
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
        id: createUUID(),
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

module.exports = avatar;
