// middleware/notFound.js — handles requests that match no route.
export default function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
