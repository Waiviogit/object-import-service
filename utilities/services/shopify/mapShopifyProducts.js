const _ = require('lodash');
const parse5 = require('parse5');
const BigNumber = require('bignumber.js');

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

const getTextContent = (node) => {
  if (node.nodeName === '#text') {
    return node.value;
  }
  if (node.childNodes) {
    return node.childNodes.map(getTextContent).join('');
  }
  return '';
};

const removeImgNodes = (node) => {
  if (node.childNodes) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.tagName === 'img') {
        node.childNodes.splice(i, 1);
      } else {
        removeImgNodes(child);
      }
    }
  }
};

const getDescriptionFromHtml = (htmlString) => {
  const document = parse5.parse(htmlString);

  // Remove all img nodes
  removeImgNodes(document);

  const text = getTextContent(document);
  if ((text?.length || 0) > 15) return parse5.serialize(document);
  return '';
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
    const fieldDescription = getDescriptionFromHtml(description);

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
        product_id: groupId,
        id: productId,
        price,
        compare_at_price: compareAtPrice,
      } = variant;

      const addComparePrice = BigNumber(compareAtPrice).gt(price);

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
          key: `shopify-${host}`, // https://mysite.myshopify.com/products/${value}
          value: `${handle}?variant=${productId}`,
        },
        {
          key: `shopify-cart-${host}`,
          value: productId,
        },
        ],
        groupId: groupId.toString(), // we can fetch product from shopify api by group id
        waivio_tags: categoryItems,
        object_type: objectType,
        merchants,
        categories,
        mostRecentPriceCurrency: currency,
        mostRecentPriceAmount: price,
        ...(weight > 0 && { productWeight: { value: weight, unit: weightUnit } }),
        waivio_options: options,
        ...(fieldDescription && { fieldDescription }),
        useGPT: !!fieldDescription,
        imageURLs,
        ...(addComparePrice && { fieldCompareAtPrice: `${currency}${compareAtPrice}` }),
      });
    }
  }

  return resultArray;
};

module.exports = mapShopifyProducts;
