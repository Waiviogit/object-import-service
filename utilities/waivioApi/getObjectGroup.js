const axios = require('axios');
const { WAIVIO_API } = require('../../constants/requestsConstants');

const API = WAIVIO_API[process.env.NODE_ENV] || WAIVIO_API.development;

const OBJECT_URL = `https://www.waivio.com${API.BASE_URL}${API.WOBJECTS}${API.GROUP}`;
const getObjectGroup = async ({ authorPermlink, cursor, limit }) => {
  try {
    const result = await axios.post(
      OBJECT_URL,
      {
        cursor,
        limit,
        authorPermlink,
      },
    );

    return result?.data;
  } catch (error) {
    return { error };
  }
};

module.exports = getObjectGroup;
