const youtubedl = require('youtube-dl-exec');
const fsp = require('fs/promises');
const crypto = require('crypto');
const { filetypemime } = require('magic-bytes.js');

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024);

const generateTempPath = () => `./temp_${crypto.randomUUID()}.mp4`;

const checkFileSize = async (filePath) => {
  const stats = await fsp.stat(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    await fsp.unlink(filePath);
    throw new Error(`Video file is too large (max ${MAX_FILE_SIZE_MB}MB)`);
  }
};

const downloadVideoAsBase64 = async (url) => {
  const tempPath = generateTempPath();
  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      // addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    });

    const videoSize = info.filesize || info.filesize_approx;

    if (videoSize && videoSize > MAX_FILE_SIZE) throw Error(`max file size is ${MAX_FILE_SIZE_MB} current video size ${videoSize / (1024 * 1024)}`);

    await youtubedl.exec(
      url,
      {
        output: tempPath,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        // addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      },
    );

    if (!videoSize) await checkFileSize(tempPath);

    const videoBuffer = await fsp.readFile(tempPath);
    const mime = filetypemime(videoBuffer);
    const base64String = videoBuffer.toString('base64');

    await fsp.unlink(tempPath);
    return { result: base64String, mime: mime?.[0] || '' };
  } catch (error) {
    await fsp.unlink(tempPath);
    console.error('Error downloading YouTube video:', error);
    return { error };
  }
};

module.exports = {
  downloadVideoAsBase64,
};
