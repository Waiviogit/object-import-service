const { Configuration, OpenAIApi } = require('openai');
const _ = require('lodash');
const { GPT_CRAFTED, QUESTION_PROMPT, BASIC_PROMPT } = require('../../constants/openai');

const configurationImport = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_API_ORG,
});

const configurationBot = new Configuration({
  apiKey: process.env.OPENAI_API_KEY_BOT,
  organization: process.env.OPENAI_API_ORG,
});

const openai = new OpenAIApi(configurationImport);
const openaiBot = new OpenAIApi(configurationBot);

const checkForPositiveAnswer = (answer = '') => answer.toLowerCase().includes('yes');

const checkAiResponse = (answer = '') => answer.toLowerCase().includes('as an ai language model');

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

const gptCreateCompletionBot = async ({ content = '' }) => {
  try {
    const response = await openaiBot.createChatCompletion({
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
  if (!result || error) return '';
  return `${result}${GPT_CRAFTED}`;
};

const makeProductDescription = async (product = '') => {
  const { result: firstResponse, error: answerError } = await gptCreateCompletion({
    content: `${QUESTION_PROMPT} product ${product}, answer only yes or no`,
  });
  if (answerError) return '';
  const positiveAnswer = checkForPositiveAnswer(firstResponse);
  if (!positiveAnswer) return '';

  const { result, error } = await gptCreateCompletion({
    content: `${BASIC_PROMPT} ${product}, try not to use name of the product`,
  });

  if (!result || error) return '';
  if (checkAiResponse(result)) return '';
  return `${result}${GPT_CRAFTED}`;
};

const makeAuthorDescription = async ({ author = '', book = '' }) => {
  const { result: firstResponse, error: answerError } = await gptCreateCompletion({
    content: `${QUESTION_PROMPT} ${author}, the author of ${book}, answer only yes or no`,
  });
  if (answerError) return '';
  const positiveAnswer = checkForPositiveAnswer(firstResponse);
  if (!positiveAnswer) return '';

  const { result, error } = await gptCreateCompletion({
    content: `${BASIC_PROMPT} ${author}, the author of ${book}`,
  });

  if (!result || error) return '';
  if (checkAiResponse(result)) return '';
  return `${result}${GPT_CRAFTED}`;
};

const makeBookDescription = async ({ author = '', book = '' }) => {
  const { result: firstResponse, error: answerError } = await gptCreateCompletion({
    content: `${QUESTION_PROMPT} book ${book}, by ${author}, answer only yes or no`,
  });
  if (answerError) return '';
  const positiveAnswer = checkForPositiveAnswer(firstResponse);
  if (!positiveAnswer) return '';

  const { result, error } = await gptCreateCompletion({
    content: `${BASIC_PROMPT} ${book}, by ${author}`,
  });

  if (!result || error) return '';
  if (checkAiResponse(result)) return '';
  return `${result}${GPT_CRAFTED}`;
};

const restGptQuery = async ({ query }) => gptCreateCompletionBot({ content: query });

const gptCreateImage = async ({ prompt = '', n = 4, size = '1024x1024' }) => {
  try {
    const response = await openaiBot.createImage({
      prompt, n, size,
    }, {
      timeout: 60000,
    });
    const result = _.get(response, 'data.data', []);
    return { result };
  } catch (error) {
    return { error };
  }
};

(async () => {
  const { result, error } = await gptCreateImage({
    prompt: 'A painting of a cat sitting on a chair',
  });
  console.log()
})()

module.exports = {
  makeDescription,
  makeAuthorDescription,
  makeBookDescription,
  makeProductDescription,
  gptCreateCompletion,
  gptCreateCompletionBot,
  restGptQuery,
  gptCreateImage,
};
