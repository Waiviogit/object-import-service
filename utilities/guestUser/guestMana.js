const { GuestManaModel } = require('../../models');

const MANA_CONSUMPTION = {
  FIELD_VOTE: 2,
  FIELD: 1,
};

// if become global set to redis
const maxMana = 1000;

const regenerationRatePerSecond = 42 / (60 * 60); // 1 mana per hour

const getManaRecord = async (account) => {
  if (!account.includes('_')) return;

  const { result } = await GuestManaModel.findOneByName(account);
  if (result) return result;
  const { result: createdDoc } = await GuestManaModel.create({ account, mana: maxMana });
  return createdDoc;
};

// Function to calculate mana regeneration
const calculateManaRegeneration = (lastUpdateTimestamp) => {
  const now = Date.now();
  const elapsedSeconds = (now - lastUpdateTimestamp) / 1000;

  const regeneratedMana = elapsedSeconds * regenerationRatePerSecond;
  return Math.floor(regeneratedMana);
};

const getCurrentMana = async (account) => {
  if (!account.includes('_')) return 0;

  const record = await getManaRecord(account);
  const { lastManaUpdate, mana } = record;

  const regeneratedMana = calculateManaRegeneration(lastManaUpdate);

  return Math.min(maxMana, mana + regeneratedMana);
};

const validateMana = async ({ account, cost = MANA_CONSUMPTION.FIELD_VOTE }) => {
  const currentMana = await getCurrentMana(account);

  return currentMana >= cost;
};

const setImportStatus = async ({ account, importAuthorization }) => {
  const record = await getManaRecord(account);
  if (!record) return { error: { status: 404, message: 'not Found' } };

  const { result, error } = await GuestManaModel.updateOneStatus({ account, importAuthorization });
  if (error) return { error };

  return {
    result: {
      account: result.account,
      importAuthorization: result.importAuthorization,
    },
  };
};

const getImportStatus = async ({ account }) => {
  const record = await getManaRecord(account);

  if (!record) return { error: { status: 404, message: 'not Found' } };

  return {
    result: {
      account: record.account,
      importAuthorization: record.importAuthorization,
    },
  };
};

module.exports = {
  getCurrentMana,
  validateMana,
  setImportStatus,
  getImportStatus,
  getManaRecord,
};
