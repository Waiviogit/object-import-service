const { importRsmqClient } = require('./index');

const deleteQueueMessage = async (id) => {
  if (!id) throw Error('no id provided');
  const deleted = await importRsmqClient.deleteMessageAsync({ qname: 'import_wobjects', id });
  console.log('deleted', !!deleted);
  process.exit();
};

deleteQueueMessage(process.argv[2]);
