const { GoogleGenerativeAI } = require('@google/generative-ai');
const { downloadVideoAsBase64 } = require('../helpers/videoDownloader');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const promptWithVideoBase64 = async ({ prompt, videoBase64, mime }) => {
  try {
    const video = {
      inlineData: {
        data: videoBase64,
        mimeType: mime || 'video/mp4',
      },
    };

    const result = await model.generateContent([prompt, video]);

    return { result: result.response.text() };
  } catch (error) {
    return { error };
  }
};

const analyzeVideo = async ({ prompt, url }) => {
  const { result: videoBase64, mime, error } = await downloadVideoAsBase64(url);
  if (error) return { error: { status: 500, message: `Video processing error: ${error.message}` } };

  const { result, error: promptError } = await promptWithVideoBase64({ prompt, videoBase64, mime });
  if (promptError) return { error: { status: 500, message: `AI processing error: ${promptError.message}` } };
  return { result };
};

module.exports = {
  promptWithVideoBase64,
  analyzeVideo,
};
