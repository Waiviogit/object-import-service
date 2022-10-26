const { ImportStatusModel, DatafinityObject } = require('../../models');
const { IMPORT_STATUS } = require('../../constants/appData');

const getStatistic = async ({ user }) => {
  const { result, error } = await ImportStatusModel.find({
    filter: {
      user,
      status: { $in: [IMPORT_STATUS.ACTIVE, IMPORT_STATUS.ON_HOLD] },
    },
  });
  if (error) return { error };

  for (const resultElement of result) {
    const { result: counter } = await DatafinityObject.distinct({
      field: '_id',
      filter: { importId: resultElement.importId, user },
    });
    resultElement.objectsLastCount = counter;
  }

  return { result };
};

const changeStatus = async ({ user, status, importId }) => {
  const { result, error } = await ImportStatusModel.findOneAndUpdate({
    filter: { user, importId },
    update: { status },
    options: { new: true },
  });

  if (error) return { error };
  const { result: counter } = await DatafinityObject.distinct({
    field: '_id',
    filter: { importId, user },
  });

  return {
    result: {
      ...result,
      objectsLastCount: counter,
    },
  };
};

const deleteImport = async ({ user, importId }) => {
  const { result, error } = await ImportStatusModel.updateOne({
    filter: { user, importId },
    update: { status: IMPORT_STATUS.DELETED },
    options: { new: true },
  });
  if (error) return { error };
  const { result: datafinityDelete, error: datafinityDeleteError } = await DatafinityObject
    .deleteMany({
      filter: { user, importId },
    });
  if (datafinityDeleteError) {
    await ImportStatusModel.updateOne({
      filter: { user, importId },
      update: { status: IMPORT_STATUS.ON_HOLD },
      options: { new: true },
    });
    return { error: datafinityDeleteError };
  }
  return { result };
};

module.exports = {
  getStatistic,
  changeStatus,
  deleteImport,
};
