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

exports.postWithOptions = async ({ comment, options, key }) => {
  try {
    const client = await getClient('test:hive:post');
    return {
      result: await client.broadcast
        .commentWithOptions(comment, options, PrivateKey.fromString(key)),
    };
  } catch (error) {
    if (error.message === 'Invalid parameters') {
      return { error: { message: 'Invalid parameters', status: 422 } };
    }
    return { error };
  }
};

exports.vote = async ({
  key, voter, author, permlink, weight,
}) => {
  try {
    const client = await getClient('test:hive:post');
    const result = await client.broadcast.vote(
      {
        voter, author, permlink, weight,
      },
      PrivateKey.fromString(key),
    );
    return { result };
  } catch (error) {
    console.log('VOTE ERROR', JSON.stringify(error));
    return { error };
  }
};
