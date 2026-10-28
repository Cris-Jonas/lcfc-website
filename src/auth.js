// 管理员鉴权：登录签发 JWT，校验中间件
const jwt = require('jsonwebtoken');
const { ADMIN_PASSWORD, JWT_SECRET } = require('./config');

function login(password) {
  if (password !== ADMIN_PASSWORD) return null;
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// Express 中间件：校验 Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: '未授权' });
  }
  next();
}

module.exports = { login, verifyToken, requireAuth };
