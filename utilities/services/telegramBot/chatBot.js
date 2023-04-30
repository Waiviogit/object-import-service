const TelegramBot = require('node-telegram-bot-api');
const { gptCreateCompletion } = require('../gptService');

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

  const { result: message, error } = await gptCreateCompletion({ content: text });
  if (error) return sendMessage({ chatId, message: error.message });

  await sendMessage({ chatId, message });
};

bot.on('message', handleMessage);
