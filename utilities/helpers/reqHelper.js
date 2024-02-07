const getAccessTokensFromReq = (req) => {
  const accessToken = req.headers['access-token'];
  const hiveAuth = req.headers['hive-auth'] === 'true';
  const waivioAuth = req.headers['waivio-auth'] === 'true';

  return { accessToken, hiveAuth, waivioAuth };
};

module.exports = {
  getAccessTokensFromReq,
};
