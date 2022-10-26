exports.parseJson = (string, onError) => {
  try {
    return JSON.parse(string);
  } catch (error) {
    return onError;
  }
};
