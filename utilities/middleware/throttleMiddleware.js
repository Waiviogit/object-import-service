const createThrottleMiddleware = (maxConcurrent = 1) => {
  let activeRequests = 0;

  return (req, res, next) => {
    if (activeRequests >= maxConcurrent) {
      return res.status(429).json({
        error: 'Service busy - another request is currently being processed',
        message: 'Please try again later',
      });
    }

    activeRequests++;
    console.log('activeRequests after increment', activeRequests);

    // Track when response finishes
    const cleanup = () => {
      if (activeRequests > 0) {
        activeRequests--;
        console.log('activeRequests after decrement', activeRequests);
      }
    };

    // Use res.on('finish') for successful responses
    res.on('finish', cleanup);

    // Use res.on('close') for aborted/errored responses
    res.on('close', cleanup);

    next();
  };
};

// Specific middleware for single request handling
const singleRequestThrottle = createThrottleMiddleware(1);

module.exports = {
  createThrottleMiddleware,
  singleRequestThrottle,
};
