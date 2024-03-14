const OpenAI = require('openai');
const _ = require('lodash');
const { GPT_CRAFTED, QUESTION_PROMPT, BASIC_PROMPT } = require('../../constants/openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_API_ORG,
});
const openaiBot = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_BOT,
  organization: process.env.OPENAI_API_ORG,
});

const checkForPositiveAnswer = (answer = '') => answer.toLowerCase().includes('yes');

const checkAiResponse = (answer = '') => answer.toLowerCase().includes('as an ai language model');

const gptCreateCompletion = async ({ content = '' }) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content,
      }],
    }, {
      timeout: 60000,
    });
    const result = _.get(response, 'choices[0].message.content', '');
    return { result };
  } catch (error) {
    return { error };
  }
};

const gptCreateCompletion4 = async ({ content = '' }) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{
        role: 'user',
        content,
      }],
    }, {
      timeout: 60000,
    });
    const result = _.get(response, 'choices[0].message.content', '');
    return { result };
  } catch (error) {
    return { error };
  }
};

const gptCreateCompletionBot = async ({ content = '' }) => {
  try {
    const response = await openaiBot.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{
        role: 'user',
        content,
      }],
    }, {
      timeout: 60000,
    });

    const result = _.get(response, 'choices[0].message.content', '');
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
    content: `${BASIC_PROMPT} ${product}`,
  });

  if (!result || error) return '';
  if (checkAiResponse(result)) return '';
  return `${result}${GPT_CRAFTED}`;
};

const makeBusinessDescription = async (business = {}) => {
  const { result: firstResponse, error: answerError } = await gptCreateCompletion({
    content: `${QUESTION_PROMPT} ${business.name}, ${business.address ? `located at ${business.address},` : ''} answer only yes or no`,
  });
  if (answerError) return '';
  const positiveAnswer = checkForPositiveAnswer(firstResponse);
  if (!positiveAnswer) return '';

  const { result, error } = await gptCreateCompletion({
    content: `${BASIC_PROMPT} ${business.name}, ${business.address ? `located at ${business.address},` : ''}`,
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

const makeDescriptionBasedOnReviews = async ({ reviews, name }) => {
  const reviewsString = reviews.join(';');

  const { result, error } = await gptCreateCompletion4({
    content: `make business description for ${name}, based on reviews and do not make a title: ${reviewsString}`,
  });

  if (!result || error) return '';
  return `${result}${GPT_CRAFTED}`;
};

const restGptQuery = async ({ query }) => gptCreateCompletionBot({ content: query });

const gptCreateImage = async ({ prompt = '', n = 1, size = '1024x1024' }) => {
  try {
    const response = await openaiBot.images.generate(
      {
        prompt,
        n,
        size,
        model: 'dall-e-3',
      },
      {
        timeout: 60000,
      },
    );
    const result = _.get(response, 'data', []);
    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  makeDescription,
  makeAuthorDescription,
  makeBookDescription,
  makeProductDescription,
  gptCreateCompletion,
  gptCreateCompletionBot,
  restGptQuery,
  gptCreateImage,
  makeBusinessDescription,
  makeDescriptionBasedOnReviews,
};
