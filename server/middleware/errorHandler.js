// middleware/errorHandler.js — centralized error handler.
// Express recognizes this as an error handler because it takes four arguments.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // Prefer an explicit err.statusCode; otherwise keep a non-2xx status already
  // set on the response; otherwise default to 500.
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
}
