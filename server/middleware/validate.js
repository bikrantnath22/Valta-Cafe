// middleware/validate.js — runs Zod schemas against request body
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (issues) {
        // Zod error
        return res.status(400).json({
          status: 'error',
          message: issues[0]?.message || 'Invalid input',
          errors: issues.map(e => ({ path: e.path?.join('.') || '', message: e.message })),
        });
      }
      next(err);
    }
  };
}
