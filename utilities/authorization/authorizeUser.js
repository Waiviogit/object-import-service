const { getNamespace } = require('cls-hooked');
const sc2 = require('sc2-sdk');

exports.authorise = async (username) => {
    const session = getNamespace('request-session');
    const accessToken = session.get('access-token');
    let isValidToken;
    isValidToken = await authoriseUser(accessToken, username);
    if (isValidToken) {
        session.set('authorised_user', username);

        return { isValid: true };
    }

    return { error: { status: 401, message: 'Token not valid!' } };
};

const authoriseUser = async (token = '', username = '') => {
    if (!token || token === '') return false;

    const api = sc2.Initialize({
        baseURL: 'https://hivesigner.com',
        accessToken: token
    });
    let user;

    try {
        user = await api.me();
    } catch (error) {
        return false;
    }

    return user._id === username;
};
