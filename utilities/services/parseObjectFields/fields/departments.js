const _ = require('lodash');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');

module.exports = (object) => {
  const fields = [];
  if (!object.categories) return;

  let categories = _.take(_.uniq(object.categories), 10);
  if (object.object_type === OBJECT_TYPES.BOOK) {
    categories = _.filter(categories, (c) => c.toLowerCase() !== 'book');
    const booksCategory = _.find(categories, (c) => c.toLowerCase() === 'books');
    if (!booksCategory) {
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
