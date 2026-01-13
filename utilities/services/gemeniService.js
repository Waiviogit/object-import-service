const { GoogleGenAI } = require('@google/genai');
const AWS = require('@aws-sdk/client-s3');
const { OBJECT_TYPES } = require('@waivio/objects-processor');
const { productSchema, businessSchema, personSchema } = require('../../constants/jsonShemaForAi');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const s3 = new AWS.S3({
  forcePathStyle: false,
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'nyc3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const AWSS3_IMAGE_PARAMS = {
  Bucket: 'waivio',
  ACL: 'public-read',
  ContentType: 'image/webp',
  ContentEncoding: 'base64',
};

const deleteFromS3 = async (key) => {
  try {
    const deletedObject = await s3.deleteObject({
      ...AWSS3_IMAGE_PARAMS,
      Key: key,
    });
    if (deletedObject?.$metadata?.httpStatusCode !== 204) {
      return { error: 'Error deleting image' };
    }
    return { success: true };
  } catch (error) {
    return { error };
  }
};

const extractHash = (url) => url.split('/').pop();

const timeout = (ms = 60 * 2000) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
});

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

const objectForImportFromImageData = {
  [OBJECT_TYPES.PRODUCT]: {
    prompt: 'Analyze this product image and generate a detailed JSON object containing: product name, description, category, price range, key features, materials, dimensions, and any visible brand information. Format the response according to the provided schema.',
    schema: productSchema,
  },
  [OBJECT_TYPES.BUSINESS]: {
    prompt: 'Analyze this image and generate a detailed JSON object. Format the response according to the provided schema. If you aware of any additional info about business (social links, description e.t.c.) use it',
    schema: businessSchema,
  },
  [OBJECT_TYPES.PERSON]: {
    prompt: 'Analyze this image and generate a detailed JSON object. Format the response according to the provided schema. If you aware of any additional info about person (social links, description e.t.c.) use it',
    schema: personSchema,
  },
};

const getObjectForImportFromImage = async ({ url, objectType }) => {
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

    const { prompt, schema } = objectForImportFromImageData[objectType]
    || objectForImportFromImageData[OBJECT_TYPES.PRODUCT];

    const config = {
      responseMimeType: 'application/json',
      responseSchema: schema,
    };

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [prompt, pictureData],
        config,
      }),
      timeout(),
    ]);

    const result = JSON.parse(response.text);
    await deleteFromS3(extractHash(url));

    return { result };
  } catch (error) {
    await deleteFromS3(extractHash(url));
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

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, video],
      }),
      timeout(),
    ]);
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

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, video],
      }),
      timeout(),
    ]);

    return { result: response.text };
  } catch (error) {
    return { error };
  }
};

const analyzeVideo = async ({ prompt, url, videoBase64 }) => {
  if (/youtube\.com/.test(url)) {
    const { result, error } = await promptWithVideoUrl({ prompt, url });
    if (error) return { error: { status: 500, message: `AI processing error: ${error.message}` } };
    return { result };
  }

  if (!videoBase64) {
    return { error: { status: 500, message: 'Video processing error' } };
  }

  const { result, error: promptError } = await promptWithVideoBase64({ prompt, videoBase64 });
  if (promptError) return { error: { status: 500, message: `AI processing error: ${promptError.message}` } };
  return { result };
};

module.exports = {
  promptWithVideoBase64,
  analyzeVideo,
  getObjectForImportFromImage,
};
