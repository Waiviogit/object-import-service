const _ = require('lodash');
const uuid = require('uuid');
const { ObjectType } = require('../../../models');
const { genRandomString } = require('../../helpers/permlinkGenerator');
const supposedUpdatesTranslate = require('../../../translations/supposedUpdates');
const indexHandler = require('./indexHandler');
const { formField } = require('../../helpers/formFieldHelper');
const { FIELDS_BY_OBJECT_TYPE } = require('../../../constants/objectTypes');

const addSupposedUpdates = async (wobject) => {
  if (!_.get(wobject, 'object_type')) return;
  const fields = [];
  if (wobject.authority) {
    fields.push(formField({
      fieldName: 'authority',
      body: wobject.authority,
      user: wobject.user,
      locale: wobject.locale,
    }));
  }

  const { locale, user } = wobject;

  const { objectType, error: objTypeError } = await ObjectType.getOne({
    name: wobject.object_type,
  });
  if (objTypeError) return { error: objTypeError };

  const supposedUpdates = _.get(objectType, 'supposed_updates', []);
  if (_.isEmpty(supposedUpdates)) return;

  const identifier = genRandomString(8).toLowerCase();

  supposedUpdates.forEach((update) => {
    _.get(update, 'values', []).forEach((value) => {
      const body = supposedUpdatesTranslate[value][locale] || supposedUpdatesTranslate[value]['en-US'];
      const field = {
        name: update.name,
        body,
        permlink: `${identifier}-${update.name.toLowerCase()}-${genRandomString(5).toLowerCase()}`,
        creator: user,
        locale,
      };
      if (update.id_path) field[update.id_path] = uuid.v4();
      fields.push(field);
    });
  });
  return fields;
};

const parseFields = async (object) => {
  const fields = [];

  const supposedUpdates = await addSupposedUpdates(object);
  if (!_.isEmpty(supposedUpdates)) fields.push(...supposedUpdates);

  const fieldTypes = FIELDS_BY_OBJECT_TYPE[object.object_type];

  for (const fieldsElementHandle of fieldTypes) {
    const field = await indexHandler[fieldsElementHandle](object, fields);

    if (field && !field.length) {
      fields.push(field);
    } else if (field && field.length) {
      fields.push(...field);
    }
  }
  return fields;
};

module.exports = {
  parseFields,
};
