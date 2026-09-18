function errorHandler(err, req, res, next) {
  console.error('API error:', err);

  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDev && { stack: err.stack })
  });
}

module.exports = errorHandler;
