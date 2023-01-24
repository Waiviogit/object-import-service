const { OBJECT_IDS, OBJECT_FIELDS, DATAFINITY_KEY } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const fields = [];
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
