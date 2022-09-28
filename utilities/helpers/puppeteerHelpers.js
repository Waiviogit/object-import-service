exports.getAuthorDataOnFilterPage = (authorNames) => {
  const elements = document.getElementsByClassName('a-size-base a-link-normal');

  for (const element of elements) {
    const url = element.getAttribute('href');
    const newUrl = url.toLowerCase().replace('-', '')
      .replace(' ', '');
    const authorFound = authorNames.find((el) => newUrl.includes(el.toLowerCase()
      .replace(' ', '')));

    if (!authorFound) {
      continue;
    }

    const splitUrl = url.split('/');

    return {
      name: splitUrl[1].trim().replace('-', ' '),
      asin: splitUrl[3].trim().split('?')[0],
    };
  }
};

exports.getAuthorDataOnBookPage = () => {
  const authors = document.getElementsByClassName('author notFaded');
  const links = [];

  for (const author of authors) {
    const element = author.getElementsByClassName('a-link-normal');

    links.push(element[0].getAttribute('href'));
  }

  return links;
};
