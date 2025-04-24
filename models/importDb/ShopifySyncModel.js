const { ShopifySync } = require('../../importObjectsDB').models;

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ShopifySync.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOneAndUpdate = async ({ filter, update, options }) => {
  try {
    const result = await ShopifySync.findOneAndUpdate(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const findOne = async ({ filter, projection, options }) => {
  try {
    const result = await ShopifySync.findOne(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const find = async ({ filter, projection, options }) => {
  try {
    const result = await ShopifySync.find(filter, projection, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const create = async (doc) => {
  try {
    const result = await ShopifySync.create(doc);
    return { result };
  } catch (error) {
    return { error };
  }
};

const createSyncDoc = async ({ userName, hostName }) => {
  const { result } = await findOne({ filter: { userName, hostName } });
  if (result) return result;
  const { result: created } = await create({ userName, hostName });
  return created;
};

const findOneByUserNameHost = async ({ userName, hostName }) => {
  const { result } = await findOne({ filter: { userName, hostName } });
  return result;
};

const updateSinceId = async ({ userName, hostName, sinceId }) => updateOne({
  filter: { userName, hostName },
  update: { sinceId },
});

const updateBeforeImport = async ({
  userName, hostName, authority, locale,
}) => updateOne({
  filter: { userName, hostName },
  update: { authority, locale, status: 'active' },
});

const updateStatus = async ({
  userName, hostName, status,
}) => updateOne({
  filter: { userName, hostName },
  update: { status },
});

const stopSyncTask = async ({ userName, hostName }) => {
  const { result } = await findOneAndUpdate({
    filter: { userName, hostName },
    update: { status: 'pending', sinceId: 0 },
    options: { new: true },
  });

  return result;
};

const findByUserName = async ({ userName }) => {
  const { result } = await find({
    filter: { userName },
    projection: { userName: 1, hostName: 1, status: 1 },
    options: { sort: { _id: -1 } },
  });

  return result;
};

module.exports = {
  createSyncDoc,
  findOneByUserNameHost,
  updateSinceId,
  updateBeforeImport,
  updateStatus,
  stopSyncTask,
  findByUserName,
};
