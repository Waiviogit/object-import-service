const _ = require('lodash');
const { FEATURES_KEYS, OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { formField } = require('../../../helpers/formFieldHelper');
const { getAuthorsData } = require('../../../helpers/amazonParseHelper');

module.exports = async (object) => {
  const fields = [];
  const merchant = 'amazon';
  const priceDataWithUrl = _.find(object.prices,
    (el) => _.includes(_.get(el, 'merchant'), merchant));

  if (!priceDataWithUrl) {
    const authorsFeature = _.find(object.features, (f) => f.key === FEATURES_KEYS.AUTHORS);

    if (!authorsFeature) return;
    const authorsFeatureValue = _.uniq(authorsFeature.value);
    for (const authorsFeatureValueElement of authorsFeatureValue) {
      fields.push(formField({
        fieldName: OBJECT_FIELDS.AUTHORS,
        body: JSON.stringify({ name: authorsFeatureValueElement }),
        user: object.user,
        locale: object.locale,
      }));
    }
    if (fields.length) return fields;
    return;
  }
  const url = _.find(_.get(priceDataWithUrl, 'sourceURLs'), (el) => el.includes(merchant));
  if (!url) {
    // todo
    return;
  }
  const authorsData = await getAuthorsData(url);

  for (const author of authorsData) {
    const connectedObject = !!author.asin;
    fields.push({
      ...formField({
        fieldName: OBJECT_FIELDS.AUTHORS,
        body: JSON.stringify({ name: author.name }),
        user: object.user,
        locale: object.locale,
      }),
      ...(connectedObject && { asin: author.asin, connectedObject }),
    });
  }
  if (fields.length) return fields;
};
