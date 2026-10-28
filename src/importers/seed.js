// 离线种子数据：用于本地验证站点是否正常渲染（非线上真实数据）
const { playersApi, standingsApi } = require('../db');

const players = [
  { number: 9, displayName: '瓦尔迪', firstName: '杰米', lastName: '瓦尔迪', enFirst: 'Jamie', enLast: 'Vardy', position: '前锋', team: 'first', nationality: ['GB'], onLoan: null, avatar: null, source: 'manual' },
  { number: 1, displayName: '赫尔曼森', firstName: '米', lastName: '赫尔曼森', enFirst: 'Mads', enLast: 'Hermansen', position: '门将', team: 'first', nationality: ['DK'], onLoan: null, avatar: null, source: 'manual' },
  { number: 6, displayName: '考迪', firstName: '', lastName: '', enFirst: 'Connor', enLast: 'Coady', position: '后卫', team: 'first', nationality: ['GB'], onLoan: { to: '某俱乐部', until: '2026-27' }, avatar: null, source: 'manual' },
  { number: 7, displayName: '梯队新星', firstName: '', lastName: '', enFirst: 'Academy', enLast: 'Star', position: '前锋', team: 'u21', nationality: ['GB'], onLoan: null, avatar: null, source: 'manual' }
];

const standings = [
  { rank: 1, team: '莱斯特城', played: 12, won: 9, drawn: 2, lost: 1, gf: 24, ga: 9, points: 29 },
  { rank: 2, team: '伯明翰', played: 12, won: 8, drawn: 3, lost: 1, gf: 20, ga: 10, points: 27 },
  { rank: 3, team: '维冈', played: 12, won: 7, drawn: 4, lost: 1, gf: 18, ga: 11, points: 25 },
  { rank: 4, team: '彼得堡联', played: 12, won: 7, drawn: 2, lost: 3, gf: 21, ga: 15, points: 23 }
];

for (const p of players) playersApi.upsert(p);
standingsApi.replaceAll(standings);
console.log(`✅ 已写入 ${players.length} 名示例球员 + ${standings.length} 条示例积分榜`);
