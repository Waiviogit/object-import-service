const _ = require('lodash');
// const objectMock = require('./mockData');

const getObjectTypeFromName = (name) => {
  const bookTypes = ['paperback', 'hardcover', 'kindle'];
  return bookTypes.some((type) => name.toLowerCase().includes(type)) ? 'book' : 'product';
};

const extractImageSrc = (htmlString) => {
  const imageSrcs = [];
  const imgTagRegex = /<img[^>]*src=["']([^"']+)["']/gi;

  let match;
  while ((match = imgTagRegex.exec(htmlString)) !== null) {
    imageSrcs.push(match[1]);
  }

  return imageSrcs;
};

const mapShopifyProducts = ({ objects = [], currency, host }) => {
  const resultArray = [];
  for (const object of objects) {
    const {
      title: name,
      image,
      status,
      product_type: productType,
      weight,
      weight_unit: weightUnit,
      handle,
      body_html: description,
    } = object;
    if (status !== 'active') continue;
    const objectType = getObjectTypeFromName(name);
    const categories = [];
    if (productType) categories.push(productType);
    const merchants = [];
    if (object.vendor) merchants.push({ name: object.vendor });

    const imageURLs = extractImageSrc(description);

    const mainImage = image.src;
    for (const variant of object.variants) {
      // Pros
      const categoryItems = object.tags.split(',').map((v) => ({
        key: 'Pros',
        value: v,
      }));

      const {
        title: fieldTitle,
        image_id: imageId,
        product_id: productId,
        id: groupId,
        price,
      } = variant;

      const avatar = _.find(object.images, (v) => v.id === imageId)?.src
          || mainImage;

      const options = [];
      for (const [index, option] of object.options.entries()) {
        const value = variant[`option${index + 1}`];
        if (!value) continue;
        options.push({
          category: option.name,
          value,
          position: `${option.position}`,
          image: avatar,
        });
      }

      resultArray.push({
        name,
        fieldTitle,
        primaryImageURLs: [avatar],
        waivio_product_ids: [{
          key: `shopify-${host}`,
          value: `${handle}?variant=${productId}`,
        }],
        groupId: groupId.toString(),
        waivio_tags: categoryItems,
        object_type: objectType,
        merchants,
        categories,
        mostRecentPriceCurrency: currency,
        mostRecentPriceAmount: price,
        ...(weight > 0 && { productWeight: { value: weight, unit: weightUnit } }),
        waivio_options: options,
        imageURLs,

        // use gpt for description
        useGPT: true,
      });
    }
  }
};

// (async () => {
//   mapShopifyProducts({ objects: [objectMock], currency: 'UAH', host: 'waiviodev.com' });
//   console.log();
// })();

module.exports = mapShopifyProducts;
