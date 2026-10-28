// 管理员登录 / Token 校验
const express = require('express');
const { login, verifyToken } = require('../auth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const password = req.body && req.body.password;
  const token = login(password);
  if (!token) return res.status(401).json({ success: false, error: '密码错误' });
  res.json({ success: true, token });
});

// GET /api/admin/verify
router.get('/verify', (req, res) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  res.json({ valid: verifyToken(token) });
});

module.exports = router;
