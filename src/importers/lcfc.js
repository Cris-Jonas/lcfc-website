// ================================================================
//  莱斯特城官网阵容抓取：英文名 + 球衣号码 + 半身照
//  说明：官网 DOM 可能变动，下方选择器为「合理默认值」，
//        首次在阿里云服务器上联调时按需微调。
// ================================================================
const cheerio = require('cheerio');
const config = require('../config');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function absolutize(url, base) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return new URL(url, base).href;
}

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/);
  if (parts.length === 1) return { enFirst: '', enLast: parts[0] };
  return { enFirst: parts.slice(0, -1).join(' '), enLast: parts[parts.length - 1] };
}

async function fetchLcfcSquad() {
  const res = await fetch(config.LCFC_SQUAD_URL, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-GB' } });
  if (!res.ok) throw new Error(`LCFC 请求失败 HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const players = [];

  // —— 选择器区域（按官网实际结构微调）——
  // 常见结构：每个球员一个卡片，含姓名、号码、图片
  $('[data-player], .player-card, .squad-item, .player').each((i, el) => {
    const e = $(el);
    const nameRaw = e.find('.player-name, .name, .player__name, h3, .title').first().text().trim();
    if (!nameRaw) return;
    const imgRaw = e.find('img').first().attr('src') || e.find('img').first().attr('data-src');
    const numRaw = e.find('.number, .shirt-number, .player-number, [data-number]').first().text().trim();
    const number = parseInt(numRaw, 10);
    const { enFirst, enLast } = splitName(nameRaw);
    players.push({
      enFirst, enLast,
      number: isNaN(number) ? null : number,
      avatar: absolutize(imgRaw, config.LCFC_SQUAD_URL),
      position: e.find('.position, .role').first().text().trim() || ''
    });
  });

  return players;
}

module.exports = { fetchLcfcSquad };
