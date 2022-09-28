const sc2 = require('sc2-sdk');

exports.authorise = async (username, accessToken) => {
  let isValidToken;
  isValidToken = await authoriseUser(accessToken, username);
  if (isValidToken) return { isValid: true };

  return { error: { status: 401, message: 'Token not valid!' } };
};

const authoriseUser = async (token = '', username = '') => {
  if (!token || token === '') return false;

  const api = sc2.Initialize({
    baseURL: 'https://hivesigner.com',
    accessToken: token,
  });
  let user;

  try {
    user = await api.me();
  } catch (error) {
    return false;
  }

  return user._id === username;
};
