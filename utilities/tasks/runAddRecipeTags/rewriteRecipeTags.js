const { WObject } = require('../../../database').models;
const _ = require('lodash');
const axios = require('axios');
const { setTimeout } = require('timers/promises');
const { vote } = require('../../hiveApi/broadcastUtil');
const getCategoryItemsFields = require('../../services/parseObjectFields/fields/tagCategory');
const { OBJECT_TYPES } = require('../../../constants/objectTypes');
const { addField } = require('../../services/importObjectsService');
const { votePowerValidation } = require('../../../validators/accountValidator');

const VOTING_ACCOUNT = 'localguide';
const MAX_POWER_RETRIES = 3;
const POWER_RETRY_DELAY_MS = 60000 * 10;
const VOTE_RETRY_COUNT = 3;
const VOTE_RETRY_DELAY_MS = 60000 * 10;
const FIELDS_RETRY_COUNT = 3;
const FIELDS_RETRY_DELAY_MS = 60000 * 10;

const rejectRecipeTags = async () => {
  try {
    while (true) {
      const objects = await WObject.find(
        {
          object_type: 'recipe',
          createdAt: { $lte: new Date('2025-11-05') },
          'authority.administrative': { $nin: ['mealprephive', 'dailydining'] },
          fields: { $elemMatch: { name: 'categoryItem', 'active_votes.0': { $exists: false } } },
          processed: false,
        },
        {
          author_permlink: 1, fields: 1, default_name: 1,
        },
        { limit: 10 },
      ).lean();
      if (!objects.length) break;

      for (const object of objects) {
        const rejectFields = _.filter(object.fields, (f) => f.name === 'categoryItem' && f.weight > 0 && !f?.active_votes?.length);
        if (!rejectFields?.length) {
          await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
        }
        let validPower = await votePowerValidation({ account: VOTING_ACCOUNT, type: 'objects' });
        if (!validPower) {
          for (let attempt = 0; attempt < MAX_POWER_RETRIES; attempt += 1) {
            console.log(`Insufficient voting power, retry ${attempt + 1}/${MAX_POWER_RETRIES} after delay`);
            await setTimeout(POWER_RETRY_DELAY_MS);
            validPower = await votePowerValidation({ account: VOTING_ACCOUNT, type: 'objects' });
            if (validPower) break;
          }
          if (!validPower) {
            console.log(`Skip object ${object.author_permlink} due to insufficient voting power after retries`);
            continue;
          }
        }
        for (const field of rejectFields) {
          let voteError;
          for (let attempt = 0; attempt <= VOTE_RETRY_COUNT; attempt += 1) {
            const { error } = await vote({
              key: process.env.FIELD_VOTES_BOT_KEY,
              voter: VOTING_ACCOUNT,
              author: field.author,
              permlink: field.permlink,
              weight: 1,
            });
            voteError = error;
            if (!voteError) {
              console.log('Vote success', {
                authorPermlink: object.author_permlink,
                author: field.author,
                permlink: field.permlink,
                weight: 1,
              });
              break;
            }

            console.log(`Vote error  ${object.author_permlink} for field ${field.permlink}, attempt ${attempt + 1}/${VOTE_RETRY_COUNT + 1}`, voteError?.message || voteError);
            if (attempt < VOTE_RETRY_COUNT) {
              await setTimeout(VOTE_RETRY_DELAY_MS);
            }
          }
          if (voteError) {
            console.log(`EXIT field object ${object.author_permlink} ${field.permlink} after retries due to vote error`);
            process.exit(1);
          }

          await setTimeout(3000);
        }
        await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
      }
    }
    console.log('Task Finished');
  } catch (error) {
    console.log(error.message);
  }
};

const addRecipeTags = async () => {
  try {
    while (true) {
      const objects = await WObject.find(
        {
          object_type: 'recipe',
          createdAt: { $lte: new Date('2025-11-05') },
          'authority.administrative': { $nin: ['mealprephive', 'dailydining'] },
          fields: { $elemMatch: { name: 'categoryItem', 'active_votes.0': { $exists: false } } },
          processed: false,
        },
        {
          author_permlink: 1, fields: 1, default_name: 1,
        },
        { limit: 10 },
      ).lean();
      if (!objects.length) break;

      for (const object of objects) {
        let fields = await getCategoryItemsFields(
          {
            object_type: OBJECT_TYPES.RECIPE,
            locale: 'en-US',
            user: VOTING_ACCOUNT,
            name: object.default_name,
          },
          object.fields,
        );
        if (!fields.length) {
          for (let attempt = 0; attempt < FIELDS_RETRY_COUNT; attempt += 1) {
            console.log(`No fields found for object ${object.author_permlink}, retry ${attempt + 1}/${FIELDS_RETRY_COUNT} after delay`);
            await setTimeout(FIELDS_RETRY_DELAY_MS);
            fields = await getCategoryItemsFields(
              {
                object_type: OBJECT_TYPES.RECIPE,
                locale: 'en-US',
                user: VOTING_ACCOUNT,
                name: object.default_name,
              },
              object.fields,
            );
            if (fields.length) break;
          }
          if (!fields.length) {
            console.log(`EXIT object ${object.author_permlink} due to empty fields after retries`);
            await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
            process.exit(1);
          }
        }

        for (const field of fields) {
          await addField({
            field,
            wobject: object,
            importingAccount: VOTING_ACCOUNT,
            existWobj: object,
          });
        }
        await setTimeout(3000);
        await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
      }
    }
    console.log('Task Finished');
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  rejectRecipeTags,
  addRecipeTags,
};
