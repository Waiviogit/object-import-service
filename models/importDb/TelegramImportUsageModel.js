const { getCurrentDateFormatted } = require('../../utilities/helpers/dateHelper');
const { TelegramImportUsage } = require('../../importObjectsDB').models;

const addTelegramRequest = async ({ telegramId, type }) => {
  try {
    const dateString = getCurrentDateFormatted();

    const result = await TelegramImportUsage.updateOne(
      {
        telegramId, dateString, type,
      },
      {
        $inc: { timesEntered: 1 },
      },
      { upsert: true },
    );

    return { result };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  addTelegramRequest,
};
