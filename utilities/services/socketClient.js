const WebSocket = require('ws');
const {
  BASE_URL, WS, WS_SET_SERVICE_NOTIFICATION,
} = require('../../constants/appData').notificationsApi;
const { redisGetter, redisSetter } = require('../redis');

const SEND_UPDATE_MAX_TIME_MS = 2000;
const UPDATE_IMPORT_TIME_KEY = 'updateImportTime';
const UPDATE_IMPORT_TIME_EXPIRE = 30;
const METHOD_UPDATE_IMPORT = 'updateImport';

const { API_KEY = '' } = process.env;

class SocketClient {
  constructor(url) {
    this.url = url;
    this.ws = new WebSocket(this.url, [], { headers: { API_KEY } });

    this.ws.on('open', () => {
      console.info('socket connection open');
    });

    this.ws.on('error', () => {
      this.ws.close();
    });
  }

  sendMessage(message) {
    if (this.ws.readyState !== 1) {
      this.ws = new WebSocket(this.url, [], { headers: { API_KEY } });
      this.ws.on('error', () => {
        this.ws.close();
      });
      return;
    }
    this.ws.send(message);
  }
}

const socketClient = new SocketClient(`${WS}${BASE_URL}`);

const sendServiceNotification = (operation) => {
  const message = JSON.stringify({ method: WS_SET_SERVICE_NOTIFICATION, payload: operation });
  socketClient.sendMessage(message);
};

const getPreviousDate = async ({ account }) => {
  const previousTime = await redisGetter.get({ key: `${UPDATE_IMPORT_TIME_KEY}:${account}` });
  if (previousTime) return +previousTime;
  return new Date().valueOf() - (SEND_UPDATE_MAX_TIME_MS + 1);
};

const setLastDate = async ({ account }) => {
  const value = new Date().valueOf();
  await redisSetter.set({
    key: `${UPDATE_IMPORT_TIME_KEY}:${account}`,
    value,
  });
  await redisSetter.expire({
    key: `${UPDATE_IMPORT_TIME_KEY}:${account}`,
    ttl: UPDATE_IMPORT_TIME_EXPIRE,
  });
};

const sendUpdateImportForUser = async ({ account }) => {
  const previousSendDate = await getPreviousDate({ account });
  const now = new Date().valueOf();
  const diff = now - previousSendDate;
  if (diff < SEND_UPDATE_MAX_TIME_MS) return;

  sendServiceNotification({
    id: METHOD_UPDATE_IMPORT,
    data: { account },
  });
  await setLastDate({ account });
};

module.exports = {
  socketClient,
  sendServiceNotification,
  sendUpdateImportForUser,
};
