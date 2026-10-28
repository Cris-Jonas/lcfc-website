// 极简 .env 加载器（避免引入额外依赖）
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change_me_strong_password',
  JWT_SECRET: process.env.JWT_SECRET || 'please_change_this_to_a_long_random_secret',
  LCFC_SQUAD_URL: process.env.LCFC_SQUAD_URL || 'https://www.lcfc.com/teams/men',
  DONGQIUDI_SQUAD_URL: process.env.DONGQIUDI_SQUAD_URL || 'https://www.dongqiudi.com/data/team/2'
};
