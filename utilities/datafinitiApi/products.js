/* eslint-disable camelcase */
const axios = require('axios');

const sendSearchRequest = async ({ query, num_records }) => {
  try {
    const result = await axios.post(
      'https://api.datafiniti.co/v4/products/search',
      {
        query,
        num_records,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DATAFINITY_API_KEY}`,
        },
        timeout: 20000,
      },
    );

    return { result: result?.data?.records ?? [] };
  } catch (error) {
    return { error };
  }
};

const sendSearchRequestByAsins = async (asin) => sendSearchRequest({
  query: `asins:${asin}`, num_records: 3,
});

module.exports = {
  sendSearchRequestByAsins,
};
