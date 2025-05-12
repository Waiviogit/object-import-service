const { GoogleGenAI } = require('@google/genai');
const { downloadVideoAsBase64 } = require('../helpers/videoDownloader');
const { productSchema } = require('../../constants/jsonShemaForAi');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const getPictureBase64ByUrl = async (url) => {
  try {
    const result = await fetch(url);
    const arrayBuffer = await result.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    return null;
  }
};

const getObjectForImportFromImage = async ({ url }) => {
  try {
    const picture = await getPictureBase64ByUrl(url);
    if (!picture) {
      return { error: { status: 500, message: 'Problem with downloading picture' } };
    }
    const pictureData = {
      inlineData: {
        data: picture,
        mimeType: 'image/webp',
      },
    };
    const prompt = 'Analyze this product image and generate a detailed JSON object containing: product name, description, category, price range, key features, materials, dimensions, and any visible brand information. Format the response according to the provided schema.';

    const config = {
      responseMimeType: 'application/json',
      responseSchema: productSchema,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: [prompt, pictureData],
      config,
    });

    const result = JSON.parse(response.text);

    return { result };
  } catch (error) {
    return { error };
  }
};

const promptWithVideoBase64 = async ({ prompt, videoBase64, mime }) => {
  try {
    const video = {
      inlineData: {
        data: videoBase64,
        mimeType: mime || 'video/mp4',
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [prompt, video],
    });

    return { result: response.text };
  } catch (error) {
    return { error };
  }
};

const promptWithVideoUrl = async ({ prompt, url }) => {
  try {
    const video = {
      fileData: {
        fileUri: url,
        mimeType: 'video/mp4',
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [prompt, video],
    });

    return { result: response.text };
  } catch (error) {
    return { error };
  }
};

const analyzeVideo = async ({ prompt, url }) => {
  if (/youtube\.com/.test(url)) {
    const { result, error } = await promptWithVideoUrl({ prompt, url });
    if (error) return { error: { status: 500, message: `AI processing error: ${error.message}` } };
    return { result };
  }

  const { result: videoBase64, mime, error } = await downloadVideoAsBase64(url);
  if (error) return { error: { status: 500, message: `Video processing error: ${error.message}` } };

  const { result, error: promptError } = await promptWithVideoBase64({ prompt, videoBase64, mime });
  if (promptError) return { error: { status: 500, message: `AI processing error: ${promptError.message}` } };
  return { result };
};

module.exports = {
  promptWithVideoBase64,
  analyzeVideo,
  getObjectForImportFromImage,
};
