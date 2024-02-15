async function fetchRequest({
  url, method = 'GET', queryParams = {}, requestBody = {}, timeout = 5000, headers = {},
}) {
  const searchParams = new URLSearchParams(queryParams);
  const requestURL = new URL(url);
  requestURL.search = searchParams;

  const requestOptions = {
    method,
    headers,
  };

  if (method === 'POST') {
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(requestBody);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestOptions.signal = controller.signal;

  try {
    const response = await fetch(requestURL, requestOptions);
    clearTimeout(timeoutId);
    const data = await response.json();

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out');
      throw new Error('Request timed out');
    }

    console.error('Error fetching data:', error);
    throw error;
  }
}

module.exports = fetchRequest;
