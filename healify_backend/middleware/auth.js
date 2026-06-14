const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !/^Bearer\s+\S+$/i.test(header)) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = header.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'healify-api',
      audience: 'healify-web',
    });
    if (!decoded.userId) throw new Error('Token is missing a user identifier.');
    req.userId = decoded.userId;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};
