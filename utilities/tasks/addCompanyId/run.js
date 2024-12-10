const addCompanyId = require('./addCompanyId');

(async () => {
  await addCompanyId(process.argv[2]);
  process.exit();
})();
