# 莱斯特城球队管理网站（自托管版 v2.0）

原项目为 Vercel + Supabase 架构，现改为**单台服务器自托管**：一个 Node 进程同时提供前端页面、API 与头像上传，数据存本地 SQLite，静态库本地托管，适配国内访问。

## 功能
- 🦊 一线队 / 梯队（U21、U18）球员卡片展示，按号码或位置排序
- ✏️ 管理员后台：新增 / 编辑 / 删除球员，上传头像
- 🌍 国籍国旗（本地 flag-icon）
- 📊 自建积分榜（后台可编辑）
- 🔄 数据抓取：`npm run import` 从莱斯特城官网抓英文名+半身照、从懂球帝抓中文名+国籍，按号码关联入库

## 目录结构
```
server.js                 # 服务入口（Express 同进程托管前端 + API）
src/config.js             # .env 加载
src/db.js                 # SQLite 建表与查询
src/auth.js               # 管理员 JWT 登录 / 校验
src/routes/               # players / admin / standings 路由
src/importers/            # lcfc.js(官网) dongqiudi.js(懂球帝) merge.js run.js seed.js
public/                   # 前端（index.html / app.js / style.css / assets / fonts / uploads）
scripts/vendor.sh         # 下载本地静态库
```

## 部署到阿里云轻量服务器

### 1. 准备环境
```bash
# 安装 Node.js 18+（推荐使用 nvm 或官方二进制）
node -v
# 安装项目依赖
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env，至少修改：
#   ADMIN_PASSWORD=你的强密码
#   JWT_SECRET=$(openssl rand -hex 32)
```

### 3. 下载本地静态库（国内稳定）
```bash
bash scripts/vendor.sh
```

### 4. 启动
```bash
npm start
# 默认监听 3000 端口，访问 http://服务器IP:3000
```

### 5. （推荐）用 nginx 反代 + HTTPS + 域名
国内用域名提供 Web 服务通常需要 **ICP 备案**。示例 nginx：
```nginx
server {
    listen 80; server_name your-domain.com;
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
    location /uploads { proxy_pass http://127.0.0.1:3000; }
}
```
生产环境建议用 `pm2` 守护进程：`npm i -g pm2 && pm2 start server.js --name lcfc`。

## 数据抓取
```bash
npm run import        # 联网抓取官网 + 懂球帝并写入数据库
```
- 选择器位于 `src/importers/lcfc.js` 与 `dongqiudi.js` 的「选择器区域」，若官网/懂球帝改版导致抓不到，按实际 DOM 微调即可。
- 关联逻辑见 `merge.js`：**优先按球衣号码匹配**；号码对不上的懂球帝条目会打印出来，需到后台手动校正。
- 抓取前建议先在服务器上跑一次，确认条数正常再写入；若两边都为 0 条，脚本不会清空现有数据。

## 本地开发 / 验证
```bash
npm install
node src/importers/seed.js   # 写入示例数据
npm start
```
浏览器打开 `http://localhost:3000`，管理员密码为 `.env` 中的 `ADMIN_PASSWORD`。

## 与原项目的主要差异
| 项 | 原版 | 现版 |
|---|---|---|
| 部署 | Vercel + Supabase | 单台服务器自托管 |
| API 地址 | 写死 `localhost:3000/api`（线上必崩）| 前后端同域，相对路径 |
| 静态库 | 海外 CDN（国内慢）| 本地托管 |
| 积分榜 | 365scores 第三方 widget | 自建表格，后台可编辑 |
| 数据来源 | 手动上传 | 官网+懂球帝自动抓取 + 后台校正 |
