/* eslint-disable camelcase */
const { PrivateKey } = require('@hiveio/dhive');
const { getClient } = require('./clientOptions');

exports.broadcastJson = async ({
  id = 'ssc-mainnet-hive',
  json,
  key,
  required_auths = [],
  required_posting_auths = [],
}) => {
  try {
    const client = await getClient('test:hive:post');
    return {
      result: await client.broadcast.json(
        {
          id,
          json,
          required_auths,
          required_posting_auths,
        },
        PrivateKey.fromString(key),
      ),
    };
  } catch (error) {
    console.error(error.message);
    return { error };
  }
};

exports.broadcastComment = async ({
  parent_author,
  parent_permlink,
  author,
  permlink,
  title,
  body,
  json_metadata,
  key,
}) => {
  try {
    const client = await getClient('test:hive:post');
    return {
      result: await client.broadcast.comment(
        {
          parent_author,
          parent_permlink,
          author,
          permlink,
          title,
          body,
          json_metadata,
        },
        PrivateKey.fromString(key),
      ),
    };
  } catch (error) {
    console.error(error.message);
    return { error };
  }
};
