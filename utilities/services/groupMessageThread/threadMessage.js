const { ThreadStatusModel, ThreadMessageModel } = require('../../../models');

const threadMessage = async ({ importId, user }) => {
  // 1 import status check and resource credits + approximate rc for 1 comment
  const importInfo = await ThreadStatusModel.getUserImport({ user, importId });
  const { pageContent } = importInfo;

  const messageInfo = await ThreadMessageModel.findOneToProcess({ importId });

  // send if error wait for 3 sec

  // TODO check when finish find one pending import if find => start
};

module.exports = threadMessage;
