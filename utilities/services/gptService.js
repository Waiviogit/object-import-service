const { Configuration, OpenAIApi } = require('openai');
const _ = require('lodash');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_API_ORG,
});
const openai = new OpenAIApi(configuration);

const gptCreateCompletion = async ({ content = '' }) => {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content,
      }],
    }, {
      timeout: 60000,
    });
    const result = _.get(response, 'data.choices[0].message.content', '');
    return { result };
  } catch (error) {
    return { error };
  }
};

const makeDescription = async (description = '') => {
  const { result, error } = await gptCreateCompletion({
    content: `Create description for product max 3 paragraph from following text: ${description}`,
  });
  if (error) return '';
  return result;
};

const makeAuthorDescription = async ({ author = '', book = '' }) => {
  const { result, error } = await gptCreateCompletion({
    content: `tell me more about ${author}, the author of ${book}`,
  });

  if (error) return '';
  return result;
};

module.exports = {
  makeDescription,
  makeAuthorDescription,
};
