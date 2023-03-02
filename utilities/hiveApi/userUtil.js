const { getClient } = require('./clientOptions');

exports.getAccount = async (name) => {
  try {
    const client = await getClient('test:hive:post');
    const [account] = await client.database.getAccounts([name]);

    if (!account) {
      return { error: { status: 404, message: 'User not found!' } };
    }

    return { account };
  } catch (error) {
    return { error };
  }
};

exports.getAccountRC = async (accountName) => {
  try {
    const client = await getClient('test:hive:post');
    const RCAccount = await client.rc.findRCAccounts([accountName]);
    return client.rc.calculateRCMana(RCAccount[0]);
  } catch (error) {
    return { error };
  }
};
