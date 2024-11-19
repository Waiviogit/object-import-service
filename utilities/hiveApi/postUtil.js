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

exports.getPost = async ({ author, permlink }) => {
  try {
    const client = await getClient('test:hive:post');
    const post = await client.database.call('get_content', [author, permlink]);

    if (post.author) {
      return { post };
    }
    return { error: { message: 'Post not found!', status: 404 } };
  } catch (e) {
    return { error: { message: 'Post not found!', status: 404 } };
  }
};
