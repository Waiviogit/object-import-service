const { addRecipeTags } = require('./rewriteRecipeTags');

(async () => {
  await addRecipeTags();
  process.exit();
})();
