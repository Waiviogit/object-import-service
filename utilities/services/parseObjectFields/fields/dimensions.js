const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, DIMENSION_UNITS } = require('../../../../constants/objectTypes');

const getWidthFromDimensions = ({
  value1,
  value2,
  value3,
  length,
  depth,
}) => {
  const width = [value1, value2, value3].find((el) => el !== length && el !== depth);
  if (width) return width;
  if (value1 === value2 && value2 === value3) return value1;
  const lengthFilter = _.filter([value1, value2, value3], (el) => el === length);
  const depthFilter = _.filter([value1, value2, value3], (el) => el === depth);
  return depthFilter.length > lengthFilter.length ? depth : length;
};

module.exports = (object) => {
  const dimension = _.get(object, 'dimension');

  if (dimension) {
    const [value1, value2, value3] = dimension.split('x').map((el) => parseFloat(el));
    if (!value1 || !value2 || !value3) return;
    const length = Math.max(value1, value2, value3);
    const depth = Math.min(value1, value2, value3);
    const width = getWidthFromDimensions({
      value1, value2, value3, length, depth,
    });

    return formField({
      fieldName: OBJECT_FIELDS.DIMENSIONS,
      locale: object.locale,
      body: JSON.stringify({
        length,
        depth,
        width,
        unit: DIMENSION_UNITS.find((el) => el.includes(dimension.split('x')[2].trim().split(' ')[1])) || 'in',
      }),
      user: object.user,
    });
  }
};
