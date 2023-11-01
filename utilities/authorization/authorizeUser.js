const sc2 = require('sc2-sdk');
const CryptoJS = require('crypto-js');
const { parseJson } = require('../helpers/jsonHelper');

const secretKey = process.env.HIVE_AUTH;

const decryptText = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedMessage;
  } catch (error) {
    return '';
  }
};

exports.authorise = async ({ username, accessToken, hiveAuth }) => {
  let isValidToken;
  if (accessToken) {
    isValidToken = await authoriseUser(accessToken, username);
  }
  if (hiveAuth) {
    isValidToken = hiveAuthUser({ token: hiveAuth, username });
  }

  if (isValidToken) return { isValid: true };

  return { error: { status: 401, message: 'Token not valid!' } };
};

const hiveAuthUser = ({ token, username }) => {
  const message = decryptText(token);
  const json = parseJson(message);

  return json.username === username && json.expire > Date.now();
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
