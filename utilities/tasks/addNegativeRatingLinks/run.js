const addNegativeRating = require('./addNegativeRating');

(async () => {
  await addNegativeRating();
  process.exit();
})();
