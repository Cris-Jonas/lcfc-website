// 自建积分榜（后台可改；管理员提交整体替换）
const express = require('express');
const { standingsApi } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /api/standings
router.get('/', (req, res) => {
  res.json(standingsApi.list());
});

// PUT /api/standings  (auth)  整体替换
router.put('/', requireAuth, (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : (req.body && req.body.rows) || [];
  // 简单校验
  const clean = rows.map((r, i) => ({
    rank: Number(r.rank || i + 1),
    team: String(r.team || '').trim(),
    played: Number(r.played || 0),
    won: Number(r.won || 0),
    drawn: Number(r.drawn || 0),
    lost: Number(r.lost || 0),
    gf: Number(r.gf || 0),
    ga: Number(r.ga || 0),
    gd: Number(r.gd != null ? r.gd : (r.gf - r.ga)),
    points: Number(r.points || 0)
  })).filter(r => r.team);
  standingsApi.replaceAll(clean);
  res.json({ success: true, count: clean.length });
});

module.exports = router;
