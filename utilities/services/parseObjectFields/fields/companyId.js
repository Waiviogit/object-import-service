const _ = require('lodash');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS, DATAFINITY_KEY } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (!_.isEmpty(object?.companyIds)) {
    return object?.companyIds.map((el) => formField({
      fieldName: OBJECT_FIELDS.COMPANY_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        companyId: el.companyId,
        companyIdType: el.companyIdType,
      }),
    }));
  }

  if (_.isEmpty(object.ids) && object.id) {
    return formField({
      fieldName: OBJECT_FIELDS.COMPANY_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        companyId: object.id,
        companyIdType: DATAFINITY_KEY,
      }),
    });
  }
  if (!_.isEmpty(object.ids)) {
    return formField({
      fieldName: OBJECT_FIELDS.COMPANY_ID,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        companyId: object.ids[0],
        companyIdType: DATAFINITY_KEY,
      }),
    });
  }
};
