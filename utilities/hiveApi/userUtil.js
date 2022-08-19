const { getClient } = require( './clientOptions' );

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
