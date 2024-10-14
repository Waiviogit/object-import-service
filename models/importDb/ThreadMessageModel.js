const { ThreadMessage } = require('../../importObjectsDB').models;

const insertMany = async (docs) => {
  try {
    const result = await ThreadMessage.insertMany(docs);

    return { count: result.length };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await ThreadMessage.findOne(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ThreadMessage.find(filter, projection, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ThreadMessage.updateOne(filter, update, options);

    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteMany = async ({ filter, options }) => {
  try {
    const result = await ThreadMessage.deleteMany(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async ({ filter, options }) => {
  try {
    const result = await ThreadMessage.countDocuments(filter, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneToProcess = async ({ importId }) => {
  const { result } = await findOne({
    filter: {
      importId,
      processed: false,
    },
  });

  return result;
};

const findOneSame = async ({ recipient, pagePermlink }) => {
  const { result } = await findOne({
    filter: {
      recipient,
      pagePermlink,
      processed: true,
    },
  });

  return result;
};

const updateImportMessage = async ({ importId, recipient }) => updateOne({
  filter: { importId, recipient },
  update: { processed: true },
});

module.exports = {
  findOne,
  insertMany,
  updateOne,
  deleteMany,
  find,
  countDocuments,
  findOneToProcess,
  updateImportMessage,
  findOneSame,
};
