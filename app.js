const express = require('express');
const logger = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { routes } = require('./routes');
const startup = require('./utilities/helpers/startupHelper');
require('./utilities/redis/subscriber/subscriber');
require('./jobs');
const swaggerDocument = require('./swagger');

dotenv.config();

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', routes);
app.use('/import-objects-service/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use((err, req, res, next) => {
  if (!err.status) {
    err.status = 500;
  }
  res.status(err.status).json({ message: err.message });
});

startup.init();

module.exports = app;
