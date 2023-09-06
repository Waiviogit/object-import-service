const _ = require('lodash');
const {
  OBJECT_IDS, OBJECT_FIELDS, DATAFINITY_KEY, DOMAINS, MODEL_NUMBER,
} = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

const addSpecialId = (object) => {
  const specialIds = [];
  if (_.includes(object.domains, DOMAINS.TARGET)) {
    const url = _.find(object.sourceURLs, (u) => u.includes(DOMAINS.TARGET));
    if (url) {
      const targetId = url.replace(/.+?(?=\/)./g, '');
      specialIds.push(formField({
        fieldName: OBJECT_FIELDS.PRODUCT_ID,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          productId: targetId,
          productIdType: OBJECT_IDS.TARGET,
        }),
      }));
    }
  }
  if (_.includes(object.domains, DOMAINS.WALMART)) {
    let hasNumeric = false;
    let notNumeric = false;
    for (const sourceUrl of object.sourceURLs) {
      if (!sourceUrl.includes(DOMAINS.WALMART)) continue;
      const walmartId = sourceUrl.replace(/.+?(?=\/)./g, '');
      const numeric = /^\d+$/.test(walmartId);
      if (numeric && hasNumeric) continue;
      if (!numeric && notNumeric) continue;
      if (numeric) hasNumeric = true;
      if (!numeric) notNumeric = true;

      specialIds.push(formField({
        fieldName: OBJECT_FIELDS.PRODUCT_ID,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          productId: walmartId,
          productIdType: numeric ? OBJECT_IDS.WALMART_NUM : OBJECT_IDS.WALMART,
        }),
      }));
    }
  }
  return specialIds;
};

module.exports = (object) => {
  const fields = [];

  if (object?.waivio_product_ids && object.waivio_product_ids.length) {
    for (const waivioProductId of object.waivio_product_ids) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.PRODUCT_ID,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          productId: waivioProductId.value,
          productIdType: waivioProductId.key,
        }),
      }));
    }
  }

  const specialIds = addSpecialId(object);
  if (!_.isEmpty(specialIds)) fields.push(...specialIds);

  const ids = Object.entries(object)
    .filter((el) => Object.values(OBJECT_IDS).some((id) => el.includes(id)));

  for (const id of ids) {
    if (id[1].length) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.PRODUCT_ID,
        locale: object.locale,
        user: object.user,
        body: JSON.stringify({
          productId: id[1],
          productIdType: id[0],
        }),
      }));
    }
  }
  if (object.modelNumber) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        productId: object.modelNumber,
        productIdType: MODEL_NUMBER,
      }),
    }));
  }

  if (fields.length) {
    return fields;
  }

  if (object.id) {
    return formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        productId: object.id,
        productIdType: DATAFINITY_KEY,
      }),
    });
  }

  if (object.keys) {
    return formField({
      fieldName: OBJECT_FIELDS.PRODUCT_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        productId: object.keys[0],
        productIdType: DATAFINITY_KEY,
      }),
    });
  }
};
