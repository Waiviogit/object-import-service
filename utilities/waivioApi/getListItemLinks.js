const axios = require('axios');
const { WAIVIO_API } = require('../../constants/requestsConstants');

// const API = WAIVIO_API[process.env.NODE_ENV] || WAIVIO_API.development;
const API = WAIVIO_API.staging;

const LIST_ITEM_URL = `${API.HOST}${API.BASE_URL}${API.WOBJECTS}${API.LIST_ITEM_LINKS}`;
const getListItemLinks = async ({ authorPermlink, scanEmbedded }) => {
  try {
    const result = await axios.post(
      LIST_ITEM_URL,
      { authorPermlink, scanEmbedded },
    );

    return { result: result?.data ?? [] };
  } catch (error) {
    return { error };
  }
};

module.exports = getListItemLinks;
