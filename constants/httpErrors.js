const statusCodes = require('http').STATUS_CODES;

function createError(code, name) {
  return function (message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = name;
    this.message = message;
    this.status = code;
  };
}

Object.keys(statusCodes)
  .filter((code) => code >= 400)
  .forEach((code) => {
    const name = statusCodes[code]
      .replace(/\W/g, '')
      .concat('Error');
    exports[name] = createError(Number(code), name);
    require('util').inherits(exports[name], Error);
  });
