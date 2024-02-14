const CryptoJS = require('crypto-js');
const axios = require('axios');
const waivioAuthorise = require('./waivioAuth/authorise');
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

const authoriseResponse = (valid = false) => {
  if (valid) return { isValid: true };

  return { error: { status: 401, message: 'Token not valid!' } };
};

exports.authorise = async ({
  username, accessToken, hiveAuth, waivioAuth,
}) => {
  if (waivioAuth) {
    console.log('waivioAuth', username);
    const isValidToken = await waivioAuthorise.authorise(username, accessToken);
    return authoriseResponse(isValidToken);
  }

  if (hiveAuth) {
    console.log('hiveAuth', username);
    const isValidToken = hiveAuthUser({ token: accessToken, username });
    return authoriseResponse(isValidToken);
  }

  if (accessToken) {
    console.log('signer', username);
    const isValidToken = await authoriseUser(accessToken, username);
    return authoriseResponse(isValidToken);
  }

  return authoriseResponse();
};

const hiveAuthUser = ({ token, username }) => {
  const message = decryptText(token);
  const json = parseJson(message);

  return json.username === username && json.expire > Date.now();
};

const authoriseRequestSigner = async (token) => {
  try {
    const response = await axios.get(
      'https://hivesigner.com/api/me',
      {
        headers: {
          Authorization: token,
        },
        timeout: 15000,
      },
    );

    return response?.data?._id;
  } catch (error) {
    return '';
  }
};

const authoriseUser = async (token = '', username = '') => {
  if (!token || token === '') return false;
  const user = await authoriseRequestSigner(token);
  console.log(username, user);

  return user === username;
};
