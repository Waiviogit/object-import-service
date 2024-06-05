const axios = require('axios');
const { WAIVIO_API } = require('../../constants/requestsConstants');

const API = WAIVIO_API[process.env.NODE_ENV] || WAIVIO_API.development;

const getObjectsFromMap = async ({ authorPermlink, skip, limit }) => {
  const MAP_ITEMS_URL = `${API.HOST}${API.BASE_URL}${API.WOBJECT}/${authorPermlink}${API.MAP}${API.LIST}`;
  try {
    const result = await axios.post(
      MAP_ITEMS_URL,
      { skip, limit },
    );

    return { result: result.data };
  } catch (error) {
    return { error };
  }
};

module.exports = getObjectsFromMap;
