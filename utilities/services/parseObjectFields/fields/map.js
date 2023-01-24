const _ = require('lodash');
const axios = require('axios');
const { formField } = require('../../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../../constants/objectTypes');
const { checkAddress } = require('../../../helpers/importDatafinityHelper');

const tryGetMapFromName = async (object) => {
  try {
    const errorResp = { error: new Error('No data') };
    const accessKey = process.env.POSITIONSTACK_KEY;
    const query = `${_.get(object, 'address')}, ${_.get(object, 'city')}`;
    const resp = await axios.get(`http://api.positionstack.com/v1/forward?access_key=${accessKey}&query=${query}&country=${_.get(object, 'country')}`);
    const data = _.get(resp, 'data.data');
    if (_.isEmpty(data)) return errorResp;
    const address = _.find(data, (d) => d.name === _.get(object, 'address'));
    if (!address) return errorResp;
    if (!address.latitude || !address.longitude) return errorResp;

    return { map: _.pick(address, ['latitude', 'longitude']) };
  } catch (error) {
    return { error };
  }
};

const getMapFromOpenStreet = async (object) => {
  try {
    const errorResp = { error: new Error('No data') };
    const query = `${_.get(object, 'address')}, ${_.get(object, 'city')}, ${_.get(object, 'postalCode')}`;
    const resp = await axios.get(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
    const data = _.get(resp, 'data');
    if (_.isEmpty(data)) return errorResp;

    const latitude = parseFloat(_.get(data, '[0].lat'));
    const longitude = parseFloat(_.get(data, '[0].long'));
    if (!latitude || !longitude) return errorResp;

    return { map: { latitude, longitude } };
  } catch (error) {
    return { error };
  }
};

module.exports = async (object) => {
  if (object.longitude && object.latitude) {
    return formField({
      fieldName: OBJECT_FIELDS.MAP,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify({
        latitude: object.latitude,
        longitude: object.longitude,
      }),
    });
  }

  const validAddress = checkAddress(object);
  if (!validAddress) return;

  const { map: positionstackMap, error } = await tryGetMapFromName(object);
  if (error) {
    const { map: openStreet, error: openStreetErr } = await getMapFromOpenStreet(object);
    if (openStreetErr) return;
    return formField({
      fieldName: OBJECT_FIELDS.MAP,
      locale: object.locale,
      user: object.user,
      body: JSON.stringify(openStreet),
    });
  }

  return formField({
    fieldName: OBJECT_FIELDS.MAP,
    locale: object.locale,
    user: object.user,
    body: JSON.stringify(positionstackMap),
  });
};
