const _ = require('lodash');
const { getBookFormatData, getProductData } = require('../../../helpers/amazonParseHelper');
const { SIZE_POSITION, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');
const { DatafinityObject } = require('../../../../models');
const { OPTIONS_CATEGORY } = require('../../../../constants/fieldParseData');

const getProductColor = (object, allFields, lastDateSeen) => {
  const lastDateSeenColor = _.get(lastDateSeen, 'color', '');
  const objectName = object.name.toLocaleLowerCase();
  const avatarField = _.find(allFields, (f) => f.name === OBJECT_FIELDS.AVATAR);
  let colorsFoundInPrice;

  const regExStartWithDash = /^-/;
  if (!_.isEmpty(object.colors)) {
    if (object.colors.length === 1) {
      const startsDash = regExStartWithDash.test(object.colors[0]);

      return formField({
        fieldName: OBJECT_FIELDS.OPTIONS,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          category: OPTIONS_CATEGORY.COLOR,
          value: startsDash ? object.colors[0].replace('-', '').trim() : object.colors[0],
          ...(avatarField && { image: avatarField.body }),
        }),
      });
    }
    for (const color of object.colors) {
      if (objectName.includes(color.toLocaleLowerCase())) {
        const startsDash = regExStartWithDash.test(color);

        return formField({
          fieldName: OBJECT_FIELDS.OPTIONS,
          locale: object.locale,
          user: object.user,
          body: JSON.stringify({
            category: OPTIONS_CATEGORY.COLOR,
            value: startsDash ? color.replace('-', '').trim() : color,
            ...(avatarField && { image: avatarField.body }),
          }),
        });
      }
      if (lastDateSeenColor.includes(color.toLocaleLowerCase())) {
        const startsDash = regExStartWithDash.test(color);
        colorsFoundInPrice = formField({
          fieldName: OBJECT_FIELDS.OPTIONS,
          locale: object.locale,
          user: object.user,
          body: JSON.stringify({
            category: OPTIONS_CATEGORY.COLOR,
            value: startsDash ? color.replace('-', '').trim() : color,
            ...(avatarField && { image: avatarField.body }),
          }),
        });
      }
    }
    if (colorsFoundInPrice) return colorsFoundInPrice;

    const color = object.colors[0];
    const startsDash = regExStartWithDash.test(color);

    return formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.COLOR,
        value: startsDash ? color.replace('-', '').trim() : color,
        position: 1,
        ...(avatarField && { image: avatarField.body }),
      }),
    });
  }
  if (lastDateSeenColor) {
    const startsDash = regExStartWithDash.test(lastDateSeenColor);

    return formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.COLOR,
        value: startsDash ? lastDateSeenColor.replace('-', '').trim() : lastDateSeenColor,
        ...(avatarField && { image: avatarField.body }),
      }),
    });
  }
};

const formFormats = (uniqFormats, obj) => {
  const fields = [];

  const skipFormats = ['paperbackpaperback', 'hardcoverhardcover'];

  for (let count = 0; count < uniqFormats.length; count++) {
    if (_.includes(skipFormats, uniqFormats[count])) continue;

    fields.push(formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: obj.locale,
      user: obj.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.FORMAT,
        value: uniqFormats[count],
        position: count,
        //  image: obj.imageURLs[count],
      }),
    }));
  }

  return fields;
};

const getEmptyOptionsSet = async ({ allFields, object }) => {
  const avatarField = _.find(allFields, (f) => f.name === OBJECT_FIELDS.AVATAR);
  const groupIdFields = _.filter(allFields, (f) => f.name === OBJECT_FIELDS.GROUP_ID);
  const groupIds = _.map(groupIdFields, 'body');

  if (!_.isEmpty(groupIds)) return;
  object.groupIds = groupIds;
  const { result } = await DatafinityObject.find({
    filter: {
      groupIds: { $in: groupIds },
      importId: object.importId,
    },
  });
  if (_.isEmpty(result)) return;

  if (result.length === 1) {
    const firstAvatar = _.find(result[0].fields, (f) => f.name === OBJECT_FIELDS.AVATAR);
    const firstField = formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.VERSION,
        value: `${result.length}`,
        position: result.length,
        ...(firstAvatar && { image: firstAvatar.body }),
      }),
    });
    await DatafinityObject.updateOne(
      { _id: result[0]._id },
      {
        $addToSet: { fields: firstField },
        $inc: { fieldsCount: 1 },
      },
    );
  }

  return formField({
    fieldName: OBJECT_FIELDS.OPTIONS,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify({
      category: OPTIONS_CATEGORY.VERSION,
      value: `${result.length + 1}`,
      position: result.length + 1,
      ...(avatarField && { image: avatarField.body }),
    }),
  });
};

const productOptions = async (object, allFields) => {
  const fields = [];
  if (object.asins) {
    const amazonOptions = await getProductData(`https://www.amazon.com/dp/${object.asins}`);
    if (!_.isEmpty(amazonOptions)) {
      for (const amazonOption of amazonOptions) {
        const { category, value } = amazonOption;
        const avatarField = _.find(allFields, (f) => f.name === OBJECT_FIELDS.AVATAR);
        fields.push(formField({
          fieldName: OBJECT_FIELDS.OPTIONS,
          locale: object.locale,
          user: object.user,
          body: JSON.stringify({
            category,
            value,
            ...(avatarField && category === OPTIONS_CATEGORY.COLOR && { image: avatarField.body }),
          }),
        }));
      }
      return fields;
    }
  }

  const lastDateSeen = _.maxBy(_.get(object, 'prices'), (p) => _.get(p, 'dateSeen[0]'));
  const color = getProductColor(object, allFields, lastDateSeen);
  if (color && !color.length) {
    fields.push(color);
  } else if (color && color.length) {
    fields.push(...color);
  }

  if (object.size) {
    const sizePosition = SIZE_POSITION[object.size.toLocaleLowerCase()] || SIZE_POSITION.default;
    fields.push(formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.SIZE,
        value: object.size,
        ...(sizePosition && { position: sizePosition }),
      }),
    }));
  }

  if (!_.isEmpty(object.sizes) && !object.size) {
    const size = object.sizes[0];
    const sizePosition = SIZE_POSITION[size.toLocaleLowerCase()] || SIZE_POSITION.default;
    fields.push(formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.SIZE,
        value: size,
        ...(sizePosition && { position: sizePosition }),
      }),
    }));
  }

  if (_.isEmpty(object.sizes) && _.get(lastDateSeen, 'size')) {
    const sizePosition = SIZE_POSITION[lastDateSeen.size.toLocaleLowerCase()]
            || SIZE_POSITION.default;
    fields.push(formField({
      fieldName: OBJECT_FIELDS.OPTIONS,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        category: OPTIONS_CATEGORY.SIZE,
        value: lastDateSeen.size,
        ...(sizePosition && { position: sizePosition }),
      }),
    }));
  }
  if (_.isEmpty(fields)) {
    return getEmptyOptionsSet({ allFields, object });
  }

  return fields;
};

const bookOptions = async (obj) => {
  const formats = _.find(obj.features, (el) => el.key.toLowerCase().includes('format'));

  if (formats) {
    const uniqFormats = _.uniq(formats.value);
    const formatsDatafinity = formFormats(uniqFormats, obj);

    if (formatsDatafinity.length) {
      return formatsDatafinity;
    }
  }

  const merchant = 'amazon';
  const priceDataWithUrl = _.find(obj.prices, (el) => el.merchant.includes(merchant));
  if (!priceDataWithUrl) {
    // todo
    return;
  }
  const url = _.find(priceDataWithUrl.sourceURLs, (el) => el.includes(merchant));
  if (!url) {
    // todo
    return;
  }
  const scrapedFormats = await getBookFormatData(url);

  if (!scrapedFormats.length) {
    return;
  }

  const formatsAmazon = formFormats(scrapedFormats, obj);

  if (!formatsAmazon.length) {
    return;
  }

  return formatsAmazon;
};

module.exports = async (obj, allFields) => {
  const optionsHandler = {
    book: bookOptions,
    product: productOptions,
    default: () => {},
  };
  return (optionsHandler[obj.object_type] || optionsHandler.default)(obj, allFields);
};
