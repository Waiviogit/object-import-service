const { permlinkGenerator } = require('./permlinkGenerator');

exports.formField = ({
  fieldName, user, body, categoryItem = false, id, locale, tagCategory,
}) => ({
  weight: 1,
  locale: locale || 'en-US',
  creator: user,
  permlink: permlinkGenerator(user),
  name: fieldName,
  body,
  ...categoryItem && { id, tagCategory: 'Tags' },
  ...(tagCategory && { tagCategory }),
  ...(id && { id }),
});
