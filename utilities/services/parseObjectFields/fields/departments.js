const _ = require('lodash');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');
const { DepartmentModel } = require('../../../../models');

const findTopLvlCategory = async (object) => {
  const topDepartments = await DepartmentModel.getTopLvlDepartments();

  for (const topDepartment of topDepartments) {
    if (_.includes(object.categories, topDepartment)) return topDepartment;
    for (const category of object.categories) {
      if (category.includes(topDepartment)) {
        return topDepartment;
      }
    }
  }
};

module.exports = async (object, allFields) => {
  const fields = [];
  if (!object?.categories?.length) return;

  const topLvlCategory = await findTopLvlCategory(object);

  let categories = _.take(
    _.compact(
      _.uniq([topLvlCategory, ...object.categories]),
    ),
    10,
  );

  if (object.object_type === OBJECT_TYPES.BOOK) {
    categories = _.filter(categories, (c) => c.toLowerCase() !== 'book');
    const booksCategory = _.find(categories, (c) => c.toLowerCase() === 'books');
    const booksDepartment = _.find(allFields, (f) => f.body === 'Books' && f.name === OBJECT_FIELDS.DEPARTMENTS);
    if (!booksCategory && !booksDepartment) {
      categories.pop();
      fields.push(formField({
        fieldName: OBJECT_FIELDS.DEPARTMENTS,
        locale: object.locale,
        user: object.user,
        body: 'Books',
      }));
    }
  }

  for (const category of categories) {
    if (/›/.test(category)) {
      for (const categoryElement of category.split('›')) {
        fields.push(formField({
          fieldName: OBJECT_FIELDS.DEPARTMENTS,
          locale: object.locale,
          user: object.user,
          body: categoryElement.trim(),
        }));
      }
      continue;
    }

    fields.push(formField({
      fieldName: OBJECT_FIELDS.DEPARTMENTS,
      locale: object.locale,
      user: object.user,
      body: category.trim(),
    }));
  }
  return fields;
};
