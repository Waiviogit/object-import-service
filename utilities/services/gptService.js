const OpenAI = require('openai');
const _ = require('lodash');
const sharp = require('sharp');
const { QUESTION_PROMPT, BASIC_PROMPT } = require('../../constants/openai');
const { loadBase64Image } = require('../helpers/imageHelper');

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
      model: 'gpt-4o',
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
      model: 'gpt-4o',
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
      model: 'gpt-4o',
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

const gptTagsFromDescription = async ({ content = '', createdTags, language }) => {
  try {
    const response = await openaiBot.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `from the given string you need to come up with 10 tags close in meaning use single word if possible ${language ? `in ${language} language` : ''}. in the process of selecting tags they should all be in lower case, don't use names of cities, countries and other territories as tags, do not use special characters, also be guided by the fact that the tags should be popular ${createdTags?.length ? `we already have this tags ${createdTags.join(',')}, don't use them` : ''}. Please provide a response in the following format: ["tag1", "tag2", "tag3", "tag4", "tag5"]`,
      }, {
        role: 'user',
        content,
      }],
    }, {
      timeout: 60000,
    });

    const result = _.get(response, 'choices[0].message.content', '');

    const parsed = JSON.parse(result);
    return { result: parsed };
  } catch (error) {
    return { error };
  }
};

const gptSystemUserPrompt = async ({ systemPrompt, userPrompt }) => {
  try {
    const response = await openaiBot.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: systemPrompt,
      }, {
        role: 'user',
        content: userPrompt,
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
  return result;
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
  return result;
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
  return result;
};

const makeLinkDescription = async (url) => {
  const { result: firstResponse, error: answerError } = await gptCreateCompletion4({
    content: `${QUESTION_PROMPT} ${url} answer only yes or no`,
  });
  if (answerError) return '';
  const positiveAnswer = checkForPositiveAnswer(firstResponse);
  if (!positiveAnswer) return '';

  const { result, error } = await gptCreateCompletion4({
    content: `${BASIC_PROMPT} ${url}`,
  });

  if (!result || error) return '';
  if (checkAiResponse(result)) return '';
  return result;
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
  return result;
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
  return result;
};

const makeDescriptionBasedOnReviews = async ({ reviews, name }) => {
  const reviewsString = reviews.join(';');

  const { result, error } = await gptCreateCompletion4({
    content: `make business description for ${name}, based on reviews and do not make a title, do not use word "nestled", avoid mentioning negative aspects, and focus on positive description: ${reviewsString}`,
  });

  if (!result || error) return '';
  return result;
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

const gptImage1Generate = async ({
  prompt = '',
  n = 1,
  size = '1024x1024',
}) => {
  try {
    const response = await openaiBot.images.generate(
      {
        prompt,
        n,
        size,
        model: 'gpt-image-1',
        output_format: 'webp',
        quality: 'medium',
      },
      {
        timeout: 60000 * 2,
      },
    );
    const result = _.get(response, 'data[0].b64_json');

    const { result: link } = await loadBase64Image(result);

    return { result: link };
  } catch (error) {
    return { error };
  }
};

const getImageFileFromUrl = async (imageUrl) => {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    const imageSharpBuffer = await sharp(imageBuffer).toFormat('webp').toBuffer();
    const imageFile = new File([imageSharpBuffer], 'image.webp', { type: 'image/webp' });

    return { result: imageFile };
  } catch (error) {
    return { error };
  }
};

const editImageFromUrl = async ({
  imageFile,
  prompt,
  n = 1,
  size = '1024x1024',
}) => {
  try {
    const response = await openaiBot.images.edit(
      {
        image: imageFile, // Pass the actual image data
        prompt,
        n,
        size,
        model: 'gpt-image-1',
        output_format: 'webp',
        quality: 'medium',
      },
      {
        timeout: 60000 * 2,
      },
    );
    const result = _.get(response, 'data[0].b64_json');

    const { result: link } = await loadBase64Image(result);

    return { result: link };
  } catch (error) {
    console.error('Error editing image:', error);
    return { error };
  }
};

const promptWithJsonSchema = async ({ prompt, jsonSchema }) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: prompt,
      }],
      response_format: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
    });

    const result = JSON.parse(response?.choices[0]?.message?.content);
    return { result };
  } catch (error) {
    return { error: error.message };
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
  gptCreateCompletion4,
  gptTagsFromDescription,
  makeLinkDescription,
  gptSystemUserPrompt,
  promptWithJsonSchema,
  editImageFromUrl,
  getImageFileFromUrl,
};
