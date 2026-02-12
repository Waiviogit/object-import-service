const { WObject } = require('../../../database').models;
const _ = require('lodash');
const { setTimeout } = require('timers/promises');
const { vote } = require('../../hiveApi/broadcastUtil');
const { OBJECT_TYPES, OBJECT_FIELDS } = require('../../../constants/objectTypes');
const { addField, IMPORT_APPEND_QNAME } = require('../../services/importObjectsService');
const { votePowerValidation } = require('../../../validators/accountValidator');
const { formField } = require('../../helpers/formFieldHelper');
const { createUUID } = require('../../helpers/cryptoHelper');
const { promptWithJsonSchema } = require('../../services/gptService');
const { recipeTagsSchemaObject } = require('../../../constants/jsonShemaForAi');

const VOTING_ACCOUNT = 'localguide';
const MAX_POWER_RETRIES = 3;
const POWER_RETRY_DELAY_MS = 60000 * 10;
const VOTE_RETRY_COUNT = 3;
const VOTE_RETRY_DELAY_MS = 60000 * 10;
const FIELDS_RETRY_COUNT = 3;
const FIELDS_RETRY_DELAY_MS = 60000 * 10;

const RECIPE_FILTER = {
  object_type: 'recipe',
  createdAt: { $lte: new Date('2025-11-05') },
  'authority.administrative': { $nin: ['mealprephive', 'dailydining'] },
  fields: { $elemMatch: { name: 'categoryItem', 'active_votes.0': { $exists: true } } },
  processed: false,
};

const RECIPE_FILTER_ADD = {
  object_type: 'recipe',
  createdAt: { $lte: new Date('2025-11-05') },
  'authority.administrative': { $nin: ['mealprephive', 'dailydining'] },
  processed: false,
};

const tagsForRecipe = async (object, allFields) => {
  const description = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.DESCRIPTION,
  )?.body;
  if (!description) return;

  const ingredients = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.RECIPE_INGREDIENTS,
  )?.body;

  const fields = [];
  let cuisineCategory = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === 'Cuisine',
  );
  let prosCategory = _.find(
    allFields,
    (f) => f.name === OBJECT_FIELDS.TAG_CATEGORY && f.body === 'Pros',
  );
  if (!cuisineCategory) {
    cuisineCategory = formField({
      fieldName: OBJECT_FIELDS.TAG_CATEGORY,
      locale: object.locale,
      user: object.user,
      body: 'Cuisine',
      id: createUUID(),
    });
    fields.push(cuisineCategory);
  }
  if (!prosCategory) {
    prosCategory = formField({
      fieldName: OBJECT_FIELDS.TAG_CATEGORY,
      locale: object.locale,
      user: object.user,
      body: 'Pros',
      id: createUUID(),
    });
    fields.push(prosCategory);
  }

  const { result = {}, error } = await promptWithJsonSchema({
    prompt: `create tags for following recipe ${object.name}, description: ${description}; ${ingredients ? `ingredients: ${ingredients}` : ''}`,
    jsonSchema: recipeTagsSchemaObject,
  });
  if (error) throw new Error(error.message);
  const { tags = [], cuisineTags = [] } = result;

  for (const tag of tags) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body: tag.replace('#', ''),
      tagCategory: 'Pros',
      id: prosCategory.id,
    }));
  }

  for (const tag of cuisineTags) {
    fields.push(formField({
      fieldName: OBJECT_FIELDS.CATEGORY_ITEM,
      locale: object.locale,
      user: object.user,
      body: tag.replace('#', ''),
      tagCategory: 'Cuisine',
      id: cuisineCategory.id,
    }));
  }

  return fields;
};

const rejectRecipeTags = async () => {
  const processedPermlinks = new Set();

  const logProcessed = () => {
    if (processedPermlinks.size) {
      console.log('Processed author_permlinks:', JSON.stringify([...processedPermlinks]));
    }
  };

  process.on('exit', logProcessed);
  process.on('SIGINT', () => { logProcessed(); process.exit(1); });
  process.on('SIGTERM', () => { logProcessed(); process.exit(1); });
  process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); logProcessed(); process.exit(1); });
  process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection:', reason); logProcessed(); process.exit(1); });

  try {
    let totalUpdated = 0;
    const totalObjects = await WObject.countDocuments(RECIPE_FILTER);
    while (true) {
      console.log(`rejectRecipeTags: ${totalUpdated} / ${totalObjects} (updated / total objects)`);

      const objects = await WObject.find(
        RECIPE_FILTER,
        {
          author_permlink: 1, fields: 1, default_name: 1,
        },
        { limit: 10 },
      ).lean();
      if (!objects.length) break;

      for (const object of objects) {
        const rejectFields = _.filter(object.fields, (f) => f.name === 'categoryItem' && f.weight > 0 && f.creator !== VOTING_ACCOUNT);
        if (!rejectFields?.length) {
          await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
          totalUpdated += 1;
          continue;
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
            throw new Error(`EXIT ${object.author_permlink} due to insufficient voting power after retries`);
          }
        }
        for (const field of rejectFields) {
          const alreadyVoted = _.find(field.active_votes, (v) => v.voter === VOTING_ACCOUNT);
          if (alreadyVoted) {
            continue;
          }
          let voteError;

          const maxVoteWeight = _.maxBy(field.active_votes, 'percent')?.percent || 2;
          const voteWeight = Math.min(
            (maxVoteWeight + 1) % 2 === 0 ? maxVoteWeight + 2 : maxVoteWeight + 1,
            9999,
          );

          for (let attempt = 0; attempt <= VOTE_RETRY_COUNT; attempt += 1) {
            const { error } = await vote({
              key: process.env.FIELD_VOTES_BOT_KEY,
              voter: VOTING_ACCOUNT,
              author: field.author,
              permlink: field.permlink,
              weight: voteWeight,
            });
            voteError = error;
            if (!voteError) {
              processedPermlinks.add(object.author_permlink);
              console.log('Vote success', { authorPermlink: object.author_permlink, weight: voteWeight });
              break;
            }

            console.log(`Vote error  ${object.author_permlink} for field ${field.permlink}, attempt ${attempt + 1}/${VOTE_RETRY_COUNT + 1}`, voteError?.message || voteError);
            if (attempt < VOTE_RETRY_COUNT) {
              await setTimeout(VOTE_RETRY_DELAY_MS);
            }
          }
          if (voteError) {
            throw new Error(`EXIT field object ${object.author_permlink} ${field.permlink} after retries due to vote error`);
          }

          await setTimeout(3000);
        }
        await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
        totalUpdated += 1;
      }
    }
    console.log('Task Finished');
    logProcessed();
  } catch (error) {
    console.log(error.message);
    logProcessed();
    process.exit(1);
  }
};

const addRecipeTags = async () => {
  try {
    let totalUpdated = 0;
    let totalFieldsAdded = 0;
    const totalObjects = await WObject.countDocuments(RECIPE_FILTER_ADD);
    while (true) {
      console.log(`addRecipeTags: ${totalUpdated} / ${totalObjects} (updated / total objects), fields added: ${totalFieldsAdded}`);

      const objects = await WObject.find(
        RECIPE_FILTER_ADD,
        {
          author_permlink: 1, fields: 1, default_name: 1, author: 1,
        },
        { limit: 10 },
      ).lean();
      if (!objects.length) break;

      for (const object of objects) {
        const description = _.find(object.fields, (f) => f.name === OBJECT_FIELDS.DESCRIPTION)?.body;
        if (!description) {
          console.log(`no description on object ${object.author_permlink}`);
          await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
          totalUpdated += 1;
          continue;
        }
        let fields = await tagsForRecipe(
          {
            object_type: OBJECT_TYPES.RECIPE,
            locale: 'en-US',
            user: VOTING_ACCOUNT,
            name: object.default_name,
          },
          object.fields,
        );
        if (!fields?.length) {
          for (let attempt = 0; attempt < FIELDS_RETRY_COUNT; attempt += 1) {
            console.log(`No fields found for object ${object.author_permlink}, retry ${attempt + 1}/${FIELDS_RETRY_COUNT} after delay`);
            await setTimeout(FIELDS_RETRY_DELAY_MS);
            fields = await tagsForRecipe(
              {
                object_type: OBJECT_TYPES.RECIPE,
                locale: 'en-US',
                user: VOTING_ACCOUNT,
                name: object.default_name,
              },
              object.fields,
            );
            if (fields?.length) break;
          }
          if (!fields?.length) {
            throw new Error(`EXIT object ${object.author_permlink} due to empty fields after retries`);
          }
        }

        for (const field of fields) {
          await addField({
            field,
            wobject: object,
            importingAccount: VOTING_ACCOUNT,
            existWobj: object,
            queueName: IMPORT_APPEND_QNAME,
          });
          totalFieldsAdded += 1;
          console.log(`Field added: ${field.name}, object: ${object.author_permlink}`);
        }
        await WObject.updateOne({ author_permlink: object.author_permlink }, { processed: true });
        totalUpdated += 1;
        await setTimeout(10000 * (fields.length || 1));
      }
    }
    console.log('Task Finished');
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = {
  rejectRecipeTags,
  addRecipeTags,
};
