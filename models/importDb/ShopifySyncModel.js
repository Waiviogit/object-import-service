const { ShopifySync } = require('../../importObjectsDB').models;

const updateOne = async ({ filter, update, options }) => {
  try {
    const result = await ShopifySync.updateOne(filter, update, options);
    return { result };
  } catch (error) {
    return { error };
  }
};

const deleteOne = async ({ filter, update, options }) => {
  try {
    const result = await ShopifySync.deleteOne(filter, update, options);
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

const createSyncDoc = async ({ userName, hostName, waivioHostName }) => {
  const { result } = await findOne({ filter: { userName, hostName, waivioHostName } });
  if (result) return result;
  const { result: created } = await create({ userName, hostName, waivioHostName });
  return created;
};

const findOneByUserNameHost = async ({ userName, waivioHostName }) => {
  const { result } = await findOne({ filter: { userName, waivioHostName } });
  return result;
};

const updateNextPageParam = async ({ userName, waivioHostName, nextPageParam }) => updateOne({
  filter: { userName, waivioHostName },
  update: { nextPageParam },
});

const updateBeforeImport = async ({
  userName, waivioHostName, authority, locale,
}) => updateOne({
  filter: { userName, waivioHostName },
  update: { authority, locale, status: 'active' },
});

const updateStatus = async ({
  userName, waivioHostName, status,
}) => updateOne({
  filter: { userName, waivioHostName },
  update: { status },
});

const stopSyncTask = async ({ userName, waivioHostName }) => {
  const { result } = await findOneAndUpdate({
    filter: { userName, waivioHostName },
    update: { status: 'pending', sinceId: 0 },
    options: { new: true },
  });

  return result;
};

const findByUserName = async ({ userName }) => {
  const { result } = await find({
    filter: { userName },
    projection: {
      userName: 1, hostName: 1, status: 1, waivioHostName: 1,
    },
    options: { sort: { _id: -1 } },
  });

  return result;
};

const deleteOneByUserNameHost = async ({ userName, waivioHostName }) => deleteOne({
  filter: { userName, waivioHostName },
});

module.exports = {
  createSyncDoc,
  findOneByUserNameHost,
  updateBeforeImport,
  updateStatus,
  stopSyncTask,
  findByUserName,
  updateNextPageParam,
  deleteOneByUserNameHost,
};
