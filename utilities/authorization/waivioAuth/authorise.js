const _ = require('lodash');
const axios = require('axios');
// eslint-disable-next-line camelcase
const { waivio_auth } = require('../../../config');
const fetchRequest = require('../../helpers/fetchHelper');

// eslint-disable-next-line camelcase
const VALIDATE_TOKEN_URL = `https://${waivio_auth.host}/${waivio_auth.baseUrl}/${waivio_auth.validateTokenPath}`;

const validateTokenRequest = async (token) => {
  try {
    const response = await fetchRequest({
      url: VALIDATE_TOKEN_URL,
      method: 'POST',
      headers: {
        'Access-Token': token,
      },
    });

    if (response) return { response };
    return { error: { message: 'Not enough response data!' } };
  } catch (error) {
    return { error };
  }
};

/**
 * Authorise user using token of waivioAuthService
 * @param {string} token Valid waivio-auth token
 * @param {string} username User name for particular token
 * @returns Promise{Boolean}  true if "token" valid for current "username", else false
 */
exports.authorise = async (username = '', token = '') => {
  const { response, error } = await validateTokenRequest(token);

  if (error) return false;
  return _.get(response, 'user.name') === username;
};
