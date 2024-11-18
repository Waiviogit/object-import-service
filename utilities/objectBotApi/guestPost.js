const axios = require('axios');
const { objectsBot } = require('../../config');

const URL = objectsBot.OBJECT_BOT_HOST_URL + objectsBot.CREATE_COMMENT;

const createGuestPost = async ({
  comment, options, userName,
}) => {
  try {
    const body = {
      data: {
        operations: [
          [
            'comment',
            comment,
          ],
          [
            'comment_options',
            options,
          ],
        ],
      },
      userName,
    };

    const result = await axios.post(
      URL,
      body,
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

module.exports = { createGuestPost };
