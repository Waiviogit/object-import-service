const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');

module.exports = async (object) => {
  if (!Array.isArray(object.fieldRecipeIngredients)
      || !object?.fieldRecipeIngredients?.length) return;

  return formField({
    fieldName: OBJECT_FIELDS.RECIPE_INGREDIENTS,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify(object.fieldRecipeIngredients),
  });
};
