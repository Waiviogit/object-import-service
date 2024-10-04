const { importRsmqClient } = require('./index');

const setQueueVT = async (vt) => {
  if (!vt) throw new Error('vt not provided');

  await importRsmqClient.setQueueAttributesAsync({ qname: 'import_wobjects', vt: Number(vt) });

  const attributes = await importRsmqClient.getQueueAttributesAsync({ qname: 'import_wobjects' });
  console.log('New attributes :', JSON.stringify(attributes, null, 2));
  process.exit();
};

setQueueVT(process.argv[2]);
