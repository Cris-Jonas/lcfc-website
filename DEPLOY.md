# LCFC 网站部署手册（阿里云轻量服务器 · Ubuntu/Debian）

按从上到下的顺序执行即可。每一段都是「做什么 → 命令 → 你应该看到的结果」。
所有命令在**你的服务器**上执行（用 SSH 登录后，终端里粘贴）。

---

## 第 0 步：登录服务器并做基础检查

用 SSH 登录（在**你自己的电脑**终端里执行，不是服务器里）：
```bash
ssh root@你的服务器公网IP
```
> 如果你用的是非 root 用户，把 `root` 换成你的用户名；轻量服务器默认常是 `root`。
> 第一次登录会问 `Are you sure you want to continue?`，输入 `yes` 回车。

登录成功后，先确认系统和是不是 Ubuntu/Debian：
```bash
cat /etc/os-release | head -2
```
应看到 `Ubuntu` 或 `Debian` 字样。继续。

---

## 第 1 步：安装运行环境（Node 20 + 编译工具 + pm2）

```bash
# 1) 安装 Node.js 20（项目依赖原生模块 better-sqlite3，需要编译工具）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential python3

# 2) 确认版本（都应 ≥ 18）
node -v      # 期望输出 v20.x.x
npm -v       # 期望输出 9.x 或 10.x

# 3) 安装 pm2（进程守护，关掉 SSH 网站也不会停）
sudo npm install -g pm2
pm2 -v
```

> 如果 `node -v` 报 "command not found"，说明上一步源没加成功，重跑 `curl ... | sudo -E bash -` 再 `sudo apt-get install -y nodejs`。

---

## 第 2 步：拉取代码

```bash
cd ~
git clone https://github.com/Cris-Jonas/lcfc-website
cd lcfc-website
ls
```
应看到 `server.js`、`package.json`、`src/`、`public/` 等。

---

## 第 3 步：安装项目依赖

```bash
npm install
```
> 这一步会编译 `better-sqlite3`，首次可能要 1–2 分钟，看到 `added xxx packages` 且无红色 `ERR!` 即成功。
> 若报编译错误，确认第 1 步的 `build-essential python3` 已装，再重跑 `npm install`。

---

## 第 4 步：配置环境变量

```bash
cp .env.example .env
nano .env
```

用方向键移动，改这两行（**务必改成你自己的复杂字符串**）：
```
ADMIN_PASSWORD=改成你的管理员密码
JWT_SECRET=改成一段随机长字符串(可搜 "随机字符串生成器" 造一个)
```
改完按 `Ctrl+O` 回车保存，`Ctrl+X` 退出。

> PORT 默认 3000，一般不用改。

---

## 第 5 步：下载本地静态库（图表/图标，国内稳定加载）

```bash
bash scripts/vendor.sh
ls public/assets/vendor
```
应看到 `echarts.min.js`、`flag-icons/`、`fontawesome/` 等文件。
> 这一步从 CDN 下载，需服务器能联网。若个别文件失败会提示，重跑一次即可。

---

## 第 6 步（可选）：先灌入示例数据看效果

```bash
npm run seed
```
会写入几个示例球员和积分榜，方便你先确认前后端打通。确认无误后可随时用真实数据覆盖。

---

## 第 7 步：用 pm2 启动并设为开机自启

```bash
pm2 start server.js --name lcfc
pm2 save
pm2 startup      # 屏幕会打印一条命令，复制它并执行（让服务器重启后自动拉起网站）
pm2 status       # 应看到 lcfc 状态为 online
```

常用管理命令：
```bash
pm2 logs lcfc    # 看实时日志（排错用）
pm2 restart lcfc # 改了代码/配置后重启
pm2 stop lcfc    # 停止
```

---

## 第 8 步：开放端口（关键，否则外网打不开）

阿里云轻量服务器有两层防火墙，两层都要放通 **3000**：

1. **阿里云控制台防火墙**（必须）：
   登录阿里云 → 轻量应用服务器 → 你的实例 → **防火墙** → 添加规则 →
   应用类型选「自定义」→ 端口 `3000` → 协议 TCP → 允许 → 确定。
2. **系统 ufw**（仅当系统启用了 ufw 时才需要）：
   ```bash
   sudo ufw status     # 若显示 active，执行下面这行
   sudo ufw allow 3000
   ```

---

## 第 9 步：浏览器验证

打开 `http://你的服务器公网IP:3000`。
- 能看到大名单 / 租借 / 积分榜页面，且图标、图表正常显示 → 部署成功 ✅
- 若打不开：先看第 10 步排查。

管理员入口：网站里点「管理员登录」，密码填第 4 步设的 `ADMIN_PASSWORD`。

---

## 第 10 步（推荐）：人工录入真实阵容（批量导入）

自动抓官网/懂球帝不稳定（官网是带鉴权的 SPA、懂球帝有反爬），所以改用**人工录入**：你整理一份花名单，一条命令灌进数据库。

### 10.1 准备花名单文件
复制模板并填写（中文名、号码、英文名、国籍、位置、是否租借）：
```bash
cp data/roster.example.json data/roster.json
nano data/roster.json
```
JSON 格式（数组，每条一个球员）：
```json
[
  {
    "number": 9,
    "enFirst": "Jamie",
    "enLast": "Vardy",
    "displayName": "瓦尔迪",
    "nationality": ["GB"],
    "position": "FW",
    "team": "first",
    "avatar": ""
  },
  {
    "number": 30,
    "enFirst": "Example",
    "enLast": "Loanee",
    "displayName": "示例租借",
    "nationality": ["GB"],
    "position": "MF",
    "team": "loan",
    "onLoanTo": "租借去向俱乐部",
    "onLoanUntil": "2026-06-30",
    "avatar": ""
  }
]
```
字段说明：
- `number`：球衣号码（留空或省略表示无号）
- `enFirst` / `enLast`：英文名（用于头像 alt、排序，可只填 `enLast`）
- `displayName`：**中文名**（页面主显示）
- `nationality`：国旗代码数组，如 `["GB"]`、`["GB","GB-SCT"]`（常用码见下）
- `position`：位置缩写 `GK/FB/CB/DM/MF/FW` 等
- `team`：`first`(一线队) 或 `loan`(租借)
- `onLoanTo` / `onLoanUntil`：仅租借球员填，显示在租借卡上
- `avatar`：头像图片 URL（留空则不显示头像；也可后续在后台上传）

常用国旗代码：`GB` 英格兰 `GB-SCT` 苏格兰 `GB-WLS` 威尔士 `FR` 法国 `ES` 西班牙 `DE` 德国 `IT` 意大利 `PT` 葡萄牙 `BR` 巴西 `AR` 阿根廷 `BE` 比利时 `HR` 克罗地亚 `DK` 丹麦 `NL` 荷兰 `SE` 瑞典 `NO` 挪威 `PL` 波兰 `JP` 日本 `KR` 韩国 `US` 美国 `SN` 塞内加尔 `MA` 摩洛哥 `NG` 尼日利亚。

> 嫌 JSON 麻烦也可以用 CSV：`cp data/roster.example.json data/roster.csv` 后按表头
> `number,enFirst,enLast,displayName,nationality,position,team,avatar,onLoanTo,onLoanUntil` 填，多国籍用逗号分隔（如 `GB,DK`）。

### 10.2 导入
```bash
npm run import:roster -- data/roster.json
# 或 CSV:  npm run import:roster -- data/roster.csv
```
- 脚本会**按号码去重**：已存在同号码球员则更新，不会重复。
- 想先清空再灌（比如从示例数据切换到真实数据）：加 `--reset`
  ```bash
  npm run import:roster -- data/roster.json --reset
  ```
- 跑完浏览器刷新 `http://服务器IP:3000` 即可看到阵容。

### 10.3 后台微调（可选）
登录管理员后台可单条**新增 / 编辑 / 删除**球员、上传头像、录入**积分榜**。

### 10.4 （备选）自动抓取
若以后想试自动抓取，仍可 `npm run import`，但需先按真实网页结构微调
`src/importers/lcfc.js` 与 `dongqiudi.js` 的选择器（官网数据走带鉴权的接口，难度较高）。

---

## 可选：绑定域名 + nginx 反代 + HTTPS（国内必须备案）

若要用域名（如 `lcfc.example.com`）且走 80/443：

1. **备案**：域名解析到该服务器 IP 后，在阿里云提交 ICP 备案（约 1–2 周，未备案的域名在国内会被阻断）。
2. 安装 nginx：
   ```bash
   sudo apt-get install -y nginx
   ```
3. 新建站点配置 `/etc/nginx/sites-available/lcfc`：
   ```nginx
   server {
       listen 80;
       server_name lcfc.example.com;   # 改成你的域名
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/lcfc /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. **HTTPS（免费）**：
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d lcfc.example.com
   ```
   之后访问 `https://lcfc.example.com`。

> 走域名后，防火墙把 80/443 也放通即可，3000 端口可只对内网（不用对外暴露）。

---

## 常见问题排查

| 现象 | 排查 |
|---|---|
| 浏览器打不开 IP:3000 | ① `pm2 status` 看是否 online ② 阿里云防火墙是否放通 3000 ③ 服务器上 `curl -s localhost:3000` 看本地是否通 |
| 图标/图表不显示 | 第 5 步 `vendor.sh` 没跑或失败，重跑并检查 `public/assets/vendor` |
| 页面能开但球员空白 | 没跑 `npm run seed` 也没 `npm run import`；或数据库路径无写入权限 |
| 抓取 import 报错/0 条 | 选择器需按实际页面微调，见第 10 步 |
| 改了代码不生效 | `pm2 restart lcfc` |

---

部署完成后，日常更新数据：`npm run import`（可加 crontab 定时，如每周一次）。
服务由 pm2 守护，崩溃会自动重启。
