const axios = require('axios');
const { WAIVIO_API } = require('../../constants/requestsConstants');

const API = WAIVIO_API[process.env.NODE_ENV] || WAIVIO_API.development;

const OBJECT_URL = `${API.HOST}${API.BASE_URL}${API.WOBJECT}`;
const getObject = async ({ authorPermlink }) => {
  try {
    const result = await axios.get(
      `${OBJECT_URL}/${authorPermlink}`,
    );

    return { result: result?.data };
  } catch (error) {
    return { error };
  }
};

module.exports = getObject;
