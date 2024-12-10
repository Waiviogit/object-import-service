const axios = require('axios');
const _ = require('lodash');
const { setTimeout } = require('node:timers/promises');
const { WObject } = require('../../../database').models;
const { FIELDS_NAMES } = require('../../../constants/wobjectsData');
const { formField } = require('../../helpers/formFieldHelper');
const { OBJECT_FIELDS } = require('../../../constants/objectTypes');
const { addField } = require('../../services/importObjectsService');

let createdFieldsCount = 0;

const placesSearchRequest = async ({
  textQuery, apiKey, location,
}) => {
  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery,
        ...location,
      },
      {
        // search for locale
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // pick fields
          'X-Goog-FieldMask': 'places.id',
        },
      },
    );

    return { result: response?.data?.places ?? [] };
  } catch (error) {
    return {
      error,
      result: [],
    };
  }
};

const createCompanyId = async (object, apiKey) => {
  if (!object.map?.coordinates) {
    await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
    return;
  }
  const existedId = _.find(object.fields, (f) => f.name === FIELDS_NAMES.COMPANY_ID);
  if (existedId) {
    await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
    return;
  }

  const longitude = object.map?.coordinates?.[0];
  const latitude = object.map?.coordinates?.[1];

  const location = {
    locationBias: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: 500,
      },
    },
  };

  const { result, error } = await placesSearchRequest({
    location,
    textQuery: object.default_name,
    apiKey,
  });
  if (error) {
    console.log(error.message);
    throw error;
  }

  if (!result?.length) {
    await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
    return;
  }

  const field = formField({
    fieldName: OBJECT_FIELDS.COMPANY_ID,
    locale: 'en-US',
    user: 'localguide',
    body: JSON.stringify({
      companyId: result[0]?.id,
      companyIdType: 'googleMaps',
    }),
  });

  await addField({
    field,
    wobject: object,
  });

  createdFieldsCount++;
  await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
  await setTimeout(1000);
};

const addCompanyId = async (apiKey) => {
  try {
    while (true) {
      const objects = await WObject.find(
        { object_type: 'restaurant', processed: false },
        {
          author_permlink: 1, map: 1, fields: 1, default_name: 1,
        },
        { limit: 10 },
      ).lean();
      if (!objects.length) break;

      for (const object of objects) {
        await createCompanyId(object, apiKey);
      }

      console.log(`createdFieldsCount: ${createdFieldsCount}`);
    }
    console.log('Task Finished');
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = addCompanyId;
