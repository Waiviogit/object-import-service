const getAccessTokensFromReq = (req) => {
  const accessToken = req.headers['access-token'];
  const hiveAuth = req.headers['hive-auth'];

  return { accessToken, hiveAuth };
};

module.exports = {
  getAccessTokensFromReq,
};
