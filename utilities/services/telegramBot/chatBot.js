const TelegramBot = require('node-telegram-bot-api');
const { gptCreateCompletionBot, gptCreateImage } = require('../gptService');

const token = process.env.CHAT_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const sendMessage = async ({ chatId, message = '' }) => {
  try {
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error(error.message);
  }
};

const handleMessage = async (msg) => {
  if (process.env.NODE_ENV !== 'production') return;
  const { text, from, chat } = msg;
  if (!text) return;
  if (from?.is_bot) return;
  const chatId = chat.id;

  const { result: message, error } = await gptCreateCompletionBot({ content: text });
  if (error) return sendMessage({ chatId, message: error.message });

  await sendMessage({ chatId, message });
};

const sendPicture = async (msg) => {
  if (process.env.NODE_ENV !== 'production') return;
  const { text, from, chat } = msg;
  const chatId = chat.id;
  if (!text) return;
  if (from?.is_bot) return;
  const { result, error } = await gptCreateImage({
    prompt: text,
  });
  if (error) return sendMessage({ chatId, message: error.message });

  const images = result.map((image) => image?.url);
  if (!images.length) return sendMessage({ chatId, message: 'No images found' });
  for (const image of images) {
    await bot.sendPhoto(chatId, image);
  }
};

bot.on('message', handleMessage);

bot.onText(/\/img/, sendPicture);
