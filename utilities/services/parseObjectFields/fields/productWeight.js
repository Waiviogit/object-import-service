const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, WEIGHT_UNITS } = require('../../../../constants/objectTypes');

module.exports = (object) => {
  if (object.productWeight) {
    const { value, unit } = object.productWeight;
    return formField({
      fieldName: OBJECT_FIELDS.WEIGHT,
      body: JSON.stringify({
        value: parseFloat(value),
        unit: WEIGHT_UNITS.find((el) => el.includes(unit)) || 'lb',
      }),
      user: object.user,
      locale: object.locale,
    });
  }

  const objWeight = _.get(object, 'weight', '');

  if (objWeight) {
    const [value, unit] = objWeight.trim().split(' ');
    let singUnit = 'lb';
    if (unit) {
      singUnit = !unit.endsWith('s') ? unit.trim() : unit.trim().slice(0, unit.length - 1);
    }

    return formField({
      fieldName: OBJECT_FIELDS.WEIGHT,
      body: JSON.stringify({
        value: parseFloat(value),
        unit: WEIGHT_UNITS.find((el) => el.includes(singUnit)) || 'lb',
      }),
      user: object.user,
      locale: object.locale,
    });
  }
};
