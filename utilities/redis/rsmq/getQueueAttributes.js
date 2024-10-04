const { importRsmqClient } = require('./index');

const getQueueAttributes = async () => {
  const attributes = await importRsmqClient.getQueueAttributesAsync({ qname: 'import_wobjects' });
  console.log('Attributes :', JSON.stringify(attributes, null, 2));
  process.exit();
};

getQueueAttributes();
