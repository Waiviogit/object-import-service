const _ = require('lodash');
const moment = require('moment');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const date = _.find(object.features, (el) => el.key.toLowerCase()
    .replace(' ', '') === OBJECT_FIELDS.PUBLICATION_DATE.toLowerCase());

  if (!date) return;
  return formField({
    fieldName: OBJECT_FIELDS.PUBLICATION_DATE,
    body: date.value
      .reduce((prev, current) => (moment().unix(prev) > moment().unix(current) ? prev : current)),
    user: object.user,
    locale: object.locale,
  });
};
