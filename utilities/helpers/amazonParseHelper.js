const axios = require('axios');
const { parse } = require('node-html-parser');
const _ = require('lodash');

const SELECTOR = {
  BOOK_PAGE: '.author, .notFaded',
  LINK: '.a-link-normal',
  FILTER_AUTHOR_PAGE: '.a-size-base .a-link-normal',
  OPTIONS: 'ul.a-unordered-list.a-nostyle.a-button-list.a-horizontal',
  SPAN_IN_A: 'a span',
};

const REF = {
  AUTHOR: 'field-author=',
};

const AMAZON_HOST = 'https://www.amazon.com';

const getPage = async (url) => {
  try {
    const response = await axios.get(url);
    if (!response && !response.data) return { error: new Error('No data from page') };
    return { page: response.data };
  } catch (error) {
    return { error };
  }
};

const getRefsFromBookPage = (authors) => authors.reduce((acc, el) => {
  const aLink = el.querySelector(SELECTOR.LINK);
  if (!aLink) return acc;
  const href = aLink.getAttribute('href');
  if (!href) return acc;
  acc.push(href);
  return acc;
}, []);

const getSecondaryAuthorsNames = (refs) => refs.reduce((acc, el) => {
  if (el.includes(REF.AUTHOR)) {
    const splitFilterRef = el.split('=');

    const name = _.get(splitFilterRef, '[3]', '').split('&')[0].replace('+', ' ');
    if (!name) return acc;
    acc.push(name);
    return acc;
  }
  return acc;
}, []);

const getAuthorsFromFilter = async ({ url, names }) => {
  if (_.isEmpty(names)) return;
  const { page, error } = await getPage(url);
  if (error) {
    console.error(error.message);
    return;
  }

  const root = parse(page);

  const elements = root.querySelectorAll(SELECTOR.FILTER_AUTHOR_PAGE);
  for (const element of elements) {
    const href = element.getAttribute('href');

    const newUrl = href.toLowerCase().replace('-', '')
      .replace(' ', '');
    const authorFound = names.find((el) => newUrl.includes(el.toLowerCase()
      .replace(' ', '')));

    if (!authorFound) {
      continue;
    }

    const splitUrl = href.split('/');
    const name = _.get(splitUrl, '[1]', '').trim().replace('-', ' ');
    const asin = _.get(splitUrl, '[3]', '').trim().split('?')[0];

    return { name, asin };
  }
};

const getAuthorsData = async (url) => {
  const onErrorResp = [];
  const asins = [];
  const { page, error } = await getPage(url);
  if (error) {
    console.error(error.message);
    return onErrorResp;
  }
  const root = parse(page);
  const authors = root.querySelectorAll(SELECTOR.BOOK_PAGE);
  if (_.isEmpty(authors)) return onErrorResp;
  const refs = getRefsFromBookPage(authors);
  if (_.isEmpty(refs)) return onErrorResp;
  const secondaryNames = getSecondaryAuthorsNames(refs);

  for (const ref of refs) {
    if (!ref.includes(REF.AUTHOR)) {
      const splitRef = ref.split('/');
      const name = _.get(splitRef, '[1]', '').trim().replace('-', ' ');
      const asin = _.get(splitRef, '[3]', '').trim();

      asins.push({ name, asin });
      continue;
    }

    const filterUrl = `${AMAZON_HOST}${ref.trim()}`;
    const authorsData = await getAuthorsFromFilter({ names: secondaryNames, url: filterUrl });
    if (authorsData) asins.push(authorsData);
  }
  const authorsWithoutAsins = secondaryNames
    .filter((name) => !asins.some((el) => el.name === name));

  return authorsWithoutAsins.length
    ? [...asins, ...authorsWithoutAsins.map((el) => ({ name: el }))]
    : asins;
};

const getBookFormatData = async (url) => {
  const onErrorResp = [];
  const { page, error } = await getPage(url);
  if (error) {
    console.error(error.message);
    return onErrorResp;
  }
  const root = parse(page);
  const options = root.querySelector(SELECTOR.OPTIONS);
  // const spans = options.querySelectorAll(SELECTOR.SPAN_IN_A);
  const innerButtons = options.querySelectorAll('.a-button-inner');
  const innerButtonsChild = innerButtons
    .flatMap((el) => el.childNodes)
    .filter((el) => el.rawAttrs === 'href="javascript:void(0)" class="a-button-text"');
  if (_.isEmpty(innerButtonsChild)) return onErrorResp;

  return _.reduce(innerButtonsChild, (acc, el) => {
    const span = el.childNodes.find((s) => s.rawTagName === 'span' && !s.rawAttrs);
    if (span) acc.push(span.innerText);

    return acc;
  }, []);
};

module.exports = {
  getAuthorsData,
  getBookFormatData,
};
