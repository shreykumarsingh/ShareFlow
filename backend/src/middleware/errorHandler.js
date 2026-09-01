const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = error.details || error.message;
  } else if (error.name === 'UnauthorizedError' || error.message === 'jwt malformed' || error.message === 'invalid signature') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (error.message === 'File not found') {
    statusCode = 404;
    message = 'File not found';
  } else if (error.message === 'File expired') {
    statusCode = 410;
    message = 'File has expired';
  } else if (error.message === 'Invalid password') {
    statusCode = 401;
    message = 'Invalid password';
  } else if (error.message === 'File too large') {
    statusCode = 413;
    message = 'File too large';
  } else if (error.message === 'Invalid file type') {
    statusCode = 422;
    message = 'Invalid file type';
  } else if (error.message && error.message.includes('already exists')) {
    statusCode = 409;
    message = error.message;
  } else if (error.message) {
    // Use the error message if it's a custom error
    message = error.message;
    // Try to determine status code from common error patterns
    if (error.message.toLowerCase().includes('not found')) {
      statusCode = 404;
    } else if (error.message.toLowerCase().includes('unauthorized') || 
               error.message.toLowerCase().includes('invalid credentials')) {
      statusCode = 401;
    } else if (error.message.toLowerCase().includes('forbidden')) {
      statusCode = 403;
    } else if (error.message.toLowerCase().includes('validation') || 
               error.message.toLowerCase().includes('invalid')) {
      statusCode = 400;
    }
  }

  // Database errors
  if (error.code === '23505') { // Unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
  } else if (error.code === '23502') { // Not null violation
    statusCode = 400;
    message = 'Missing required field';
  }

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = null;
  } else if (process.env.NODE_ENV !== 'production') {
    details = error.stack;
  }

  res.status(statusCode).json({
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

module.exports = errorHandler;