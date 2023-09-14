const express = require('express');
const logger = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const { routes } = require('./routes');
const startup = require('./utilities/helpers/startupHelper');
require('./utilities/redis/subscriber/subscriber');
require('./jobs');
const swaggerDocument = require('./swagger');

dotenv.config();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(logger('dev'));

app.use('/', routes);
app.use('/import-objects-service/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err, req, res, next) => {
  if (!err.status) {
    err.status = 500;
  }
  res.status(err.status).json({ message: err.message });
});

startup.init();
if (process.env.NODE_ENV === 'production') {
  require('./utilities/services/telegramBot/chatBot');
}

module.exports = app;
