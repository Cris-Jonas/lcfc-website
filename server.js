// ================================================================
//  莱斯特城球队管理网站 - 自托管服务入口
//  单进程同时提供：前端静态页面 + API + 头像上传目录
// ================================================================
const path = require('path');
const express = require('express');
const config = require('./src/config');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/players', require('./src/routes/players'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/standings', require('./src/routes/standings'));

// 头像上传目录（对外可访问）
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 前端静态资源
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// 单页应用兜底：非 /api 路径都返回 index.html
app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`✅ LCFC 网站已启动: http://localhost:${PORT}`);
  console.log(`   管理后台密码请在 .env 的 ADMIN_PASSWORD 中设置`);
});
