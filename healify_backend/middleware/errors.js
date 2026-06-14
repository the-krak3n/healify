function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors).map((item) => item.message).join(' ');
    return res.status(400).json({ error: message || 'Invalid request data.' });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid resource identifier.' });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}

module.exports = { errorHandler, notFound };
