// 球员 CRUD + 头像上传（落到本地 public/uploads）
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { playersApi } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 把 data:image base64 或外链 处理成可存储的 avatar 值
function resolveAvatar(body, file) {
  if (file) return '/uploads/' + file.filename;
  const a = body.avatar;
  if (!a) return null;
  if (a.startsWith('data:image')) {
    try {
      const mime = a.match(/data:(.*?);base64/)[1];
      const ext = (mime.split('/')[1] || 'png').replace('+xml', '');
      const base64 = a.split(',')[1];
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, name), Buffer.from(base64, 'base64'));
      return '/uploads/' + name;
    } catch (e) {
      console.error('头像解析失败', e);
      return null;
    }
  }
  // 已是路径或外链，原样保留
  return a;
}

function parseJsonField(s, fallback) {
  if (s == null || s === '') return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

// GET /api/players
router.get('/', (req, res) => {
  res.json(playersApi.list());
});

// POST /api/players  (auth)  新建或更新
router.post('/', requireAuth, upload.single('avatar'), (req, res) => {
  const b = req.body || {};
  const avatar = resolveAvatar(b, req.file);
  const player = playersApi.upsert({
    id: b.id ? Number(b.id) : null,
    number: b.number,
    displayName: b.displayName,
    firstName: b.firstName,
    lastName: b.lastName,
    enFirst: b.enFirst,
    enLast: b.enLast,
    position: b.position,
    team: b.team,
    nationality: parseJsonField(b.nationality, ['GB']),
    onLoan: parseJsonField(b.onLoan, null),
    avatar,
    source: 'manual'
  });
  res.json({ success: true, player });
});

// DELETE /api/players/:id  (auth)
router.delete('/:id', requireAuth, (req, res) => {
  const p = playersApi.remove(Number(req.params.id));
  if (p && p.avatar && p.avatar.startsWith('/uploads/')) {
    const fp = path.join(uploadDir, path.basename(p.avatar));
    try { fs.unlinkSync(fp); } catch {}
  }
  res.json({ success: true });
});

module.exports = router;
