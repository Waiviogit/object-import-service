const { getClient } = require('./clientOptions');

exports.getAccountPosts = async ({
  account,
  limit = 1,
}) => {
  try {
    const client = await getClient('test:hive:post');
    return {
      result: await client.call(
        'bridge',
        'get_account_posts',
        { sort: 'posts', account, limit },
      ),
    };
  } catch (error) {
    console.error(error.message);
    return { error };
  }
};
