// ================================================================
//  懂球帝阵容抓取：中文名 + 国籍
//  说明：懂球帝有反爬，需要在阿里云服务器上联调 UA / 必要时加延时。
//        国籍为中文（如「英格兰」），映射为 flag-icon 代码（如 GB）。
// ================================================================
const cheerio = require('cheerio');
const config = require('../config');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// 常见国家中文名 -> flag-icon 代码
const COUNTRY_MAP = {
  '英格兰': 'GB', '英国': 'GB', '苏格兰': 'GB-SCT', '威尔士': 'GB-WLS', '北爱尔兰': 'GB-NIR',
  '法国': 'FR', '西班牙': 'ES', '德国': 'DE', '意大利': 'IT', '葡萄牙': 'PT', '荷兰': 'NL',
  '巴西': 'BR', '阿根廷': 'AR', '比利时': 'BE', '克罗地亚': 'HR', '丹麦': 'DK', '瑞典': 'SE',
  '挪威': 'NO', '波兰': 'PL', '捷克': 'CZ', '奥地利': 'AT', '瑞士': 'CH', '土耳其': 'TR',
  '日本': 'JP', '韩国': 'KR', '澳大利亚': 'AU', '美国': 'US', '加拿大': 'CA', '墨西哥': 'MX',
  '塞内加尔': 'SN', '摩洛哥': 'MA', '尼日利亚': 'NG', '埃及': 'EG', '阿尔及利亚': 'DZ',
  '乌克兰': 'UA', '俄罗斯': 'RU', '爱尔兰': 'IE', '冰岛': 'IS', '芬兰': 'FI', '希腊': 'GR'
};
function toCode(country) {
  if (!country) return 'GB';
  const c = country.trim();
  if (COUNTRY_MAP[c]) return COUNTRY_MAP[c];
  // 已是代码则原样返回
  if (/^[A-Z]{2}(-[A-Z]{3})?$/.test(c)) return c;
  return 'GB';
}

async function fetchDongqiudiSquad() {
  const res = await fetch(config.DONGQIUDI_SQUAD_URL, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN' } });
  if (!res.ok) throw new Error(`懂球帝请求失败 HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const players = [];

  // —— 选择器区域（按懂球帝实际结构微调）——
  $('.player-item, .player, [data-player], .team-player').each((i, el) => {
    const e = $(el);
    const nameRaw = e.find('.name, .player-name, .pname, .player__name').first().text().trim();
    if (!nameRaw) return;
    const countryRaw = e.find('.country, .nation, .player-country, .flag').first().text().trim();
    const numRaw = e.find('.number, .shirt, .player-number').first().text().trim();
    const number = parseInt(numRaw, 10);
    players.push({
      displayName: nameRaw,
      nationality: [toCode(countryRaw)],
      number: isNaN(number) ? null : number
    });
  });

  return players;
}

module.exports = { fetchDongqiudiSquad, toCode, COUNTRY_MAP };
