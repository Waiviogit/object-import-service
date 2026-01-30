const { rejectRecipeTags } = require('./rewriteRecipeTags');

(async () => {
  await rejectRecipeTags();
  process.exit();
})();
