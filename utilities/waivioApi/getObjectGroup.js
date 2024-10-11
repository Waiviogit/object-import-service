const axios = require('axios');
const { WAIVIO_API } = require('../../constants/requestsConstants');

const API = WAIVIO_API[process.env.NODE_ENV] || WAIVIO_API.development;

const OBJECT_URL = `${API.HOST}${API.BASE_URL}${API.WOBJECTS}${API.GROUP}`;
const getObjectGroup = async ({ authorPermlink, lastName, limit }) => {
  try {
    const result = await axios.post(
      OBJECT_URL,
      {
        lastName,
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
