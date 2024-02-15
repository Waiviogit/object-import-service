const _ = require('lodash');
const { HIVE_ENGINE_NODES } = require('../../constants/requestsConstants');
const fetchRequest = require('../helpers/fetchHelper');

exports.engineProxy = async ({
  hostUrl = _.sample(HIVE_ENGINE_NODES),
  method,
  params,
  endpoint,
  id,
  attempts = 5,
}) => {
  const response = await this.engineQuery({
    hostUrl,
    method,
    params,
    endpoint,
    id,
  });
  if (_.has(response, 'error')) {
    if (attempts <= 0) return response;
    console.log('change node', attempts, hostUrl);

    return this.engineProxy({
      hostUrl: getNewNodeUrl(hostUrl),
      method,
      params,
      endpoint,
      id,
      attempts: attempts - 1,
    });
  }

  return response;
};

exports.engineQuery = async ({
  hostUrl,
  method = 'find',
  params,
  endpoint = '/contracts',
  id = 'ssc-mainnet-hive',
}) => {
  try {
    const resp = await fetchRequest({
      url: `${hostUrl}${endpoint}`,
      method: 'POST',
      requestBody: {
        jsonrpc: '2.0',
        method,
        params,
        id,
      },
      timeout: 5000,

    });

    return _.get(resp, 'result');
  } catch (error) {
    return { error };
  }
};

const getNewNodeUrl = (hostUrl) => {
  const index = hostUrl ? HIVE_ENGINE_NODES.indexOf(hostUrl) : 0;

  return index === HIVE_ENGINE_NODES.length - 1
    ? HIVE_ENGINE_NODES[0]
    : HIVE_ENGINE_NODES[index + 1];
};
