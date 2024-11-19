const unidecode = require('unidecode');
const getSlug = require('speakingurl');
const crypto = require('node:crypto');
const { Wobj } = require('../../models');
const { getPost } = require('../hiveApi/postUtil');

const PERMLINK_MAX_LEN = 255;

exports.genRandomString = (stringLength) => {
  let randomString = '';
  let randomAscii;
  const asciiLow = 65;
  const asciiHigh = 90;

  for (let i = 0; i < stringLength; i += 1) {
    randomAscii = Math.floor(Math.random() * (asciiHigh - asciiLow) + asciiLow);
    randomString += String.fromCharCode(randomAscii);
  }
  return randomString;
};

exports.permlinkGenerator = (string) => {
  const permlink = `${this.genRandomString(3)}-${unidecode(string)}`
    .toLowerCase()
    .replace(/[ _]/g, '-')
    .replace(/[.]/g, '')
    .replace(/[^a-z0-9-]+/g, '');

  return permlink.length > PERMLINK_MAX_LEN ? permlink.substring(0, PERMLINK_MAX_LEN) : permlink;
};

exports.generateUniquePermlink = async (name) => {
  let permlink;
  let wobj;

  do {
    permlink = this.permlinkGenerator(name);
    const { wobject, error } = await Wobj.getOne({ author_permlink: permlink });

    if (error) {
      break;
    }

    if (!wobject) {
      break;
    }

    wobj = wobject;
  } while (permlink === wobj.author_permlink);

  return permlink;
};

const base58Encode = (buffer) => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt(`0x${buffer.toString('hex')}`);
  let encoded = '';

  while (num > 0) {
    const remainder = num % 58n;
    num /= 58n;
    encoded = alphabet[remainder] + encoded;
  }

  return encoded;
};

const checkPermLinkLength = (permlink = '') => {
  if (permlink.length > PERMLINK_MAX_LEN) permlink = permlink.substring(0, PERMLINK_MAX_LEN);
  return permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '');
};

exports.createPostPermlink = async ({ author, title }) => {
  let permlink = getSlug(title.replace(/[<>]/g, ''), { truncate: 128 });
  if (permlink === '') {
    permlink = base58Encode(crypto.randomBytes(4));
  }
  if (author.includes('_')) {
    const prefix = base58Encode(crypto.randomBytes(4));
    permlink = prefix + permlink;
    return checkPermLinkLength(permlink);
  }

  const { result } = await getPost({ author, permlink });
  if (result) {
    const prefix = base58Encode(crypto.randomBytes(4));
    permlink = prefix + permlink;
    return checkPermLinkLength(permlink);
  }

  return checkPermLinkLength(permlink);
};
