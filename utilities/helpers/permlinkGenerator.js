const unidecode = require('unidecode');
const { Wobj } = require('../../models');

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
