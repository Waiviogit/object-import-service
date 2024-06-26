const { App } = require('../../database').models;

const getOne = async ({ host }) => {
  try {
    const app = await App.findOne({ host }).lean();

    if (!app) {
      return { error: { status: 404, message: 'App not found!' } };
    }
    return { app };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  getOne,
};
