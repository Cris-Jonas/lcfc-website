const jwt = require('jsonwebtoken');
const ADMIN_PASSWORD = 'fnq2016';
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => {
    try {
      const { password } = JSON.parse(d);
      if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
      } else {
        res.status(401).json({ success: false, error: '密码错误' });
      }
    } catch {
      res.status(400).json({ error: '请求格式错误' });
    }
  });
};