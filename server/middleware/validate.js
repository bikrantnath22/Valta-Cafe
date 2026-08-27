// middleware/validate.js — runs Zod schemas against request body
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err.errors) {
        // Zod error
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      next(err);
    }
  };
}
