const axios = require('axios');
const { objectsBot } = require('../../config');

const URL = objectsBot.OBJECT_BOT_HOST_URL + objectsBot.VOTE_ROUTE;

const send = async ({
  author,
  permlink,
  voter,
  authorPermlink,
  fieldType,
}) => {
  try {
    const result = await axios.post(
      URL,
      {
        author,
        permlink,
        voter,
        authorPermlink,
        fieldType,
      },
      {
        headers: {
          api_key: process.env.OBJECT_BOT_API_KEY,
          'access-key': process.env.OBJECT_BOT_ACCESS_KEY,
        },
      },
    );
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = { send };
