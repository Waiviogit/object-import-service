const _ = require('lodash');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = async (object) => {
  if (!object.features || !Array.isArray(object.features)) return;
  const objPublisher = _.find(object.features, (f) => f.key.toLowerCase() === OBJECT_FIELDS.PUBLISHER);
  if (!objPublisher) return;
  const publisherName = _.get(objPublisher, 'value[0]');
  if (!publisherName) return;

  if (objPublisher) {
    return formField({
      fieldName: OBJECT_FIELDS.PUBLISHER,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({ name: publisherName }),
    });
  }
};
