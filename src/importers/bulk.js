// ================================================================
//  批量导入花名单（人工录入用）
//  用法:
//    node src/importers/bulk.js data/roster.json
//    node src/importers/bulk.js data/roster.csv
//    node src/importers/bulk.js data/roster.json --reset   # 先清空现有球员再导入
//
//  JSON 格式: 数组，每个对象字段见 data/roster.example.json
//  CSV  表头: number,enFirst,enLast,displayName,nationality,position,team,avatar,onLoanTo,onLoanUntil
//    - nationality 可填 "GB" 或 "GB,DK"（多国籍用逗号分隔）
//    - team 填 first 或 loan（租借）
//    - 空字段留空即可
// ================================================================
const fs = require('fs');
const path = require('path');
const { playersApi } = require('../db');

const file = process.argv[2];
const reset = process.argv.includes('--reset');
if (!file) {
  console.error('用法: node src/importers/bulk.js <roster.json|roster.csv> [--reset]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('找不到文件:', file);
  process.exit(1);
}

const ext = path.extname(file).toLowerCase();
let rows;
if (ext === '.csv') {
  rows = parseCsv(fs.readFileSync(file, 'utf8'));
} else {
  try {
    rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('JSON 解析失败:', e.message);
    process.exit(1);
  }
}
if (!Array.isArray(rows)) {
  console.error('JSON 顶层必须是数组');
  process.exit(1);
}

// 可选：先清空现有球员（切换示例数据/重灌时很有用）
if (reset) {
  const all = playersApi.list();
  for (const p of all) playersApi.remove(p.id);
  console.log(`🧹 已清空 ${all.length} 名旧球员`);
}

// 去重：按号码优先，否则按(中文名 / 英文名)匹配已有记录 → 更新而非新增
const existing = playersApi.list();
function findExisting(r) {
  if (r.number != null && r.number !== '') {
    const byNum = existing.find(e => e.number === Number(r.number));
    if (byNum) return byNum;
  }
  return existing.find(e =>
    (r.displayName && e.displayName === r.displayName) ||
    (r.enLast && e.enLast === r.enLast)
  );
}

let inserted = 0, updated = 0;
for (const r of rows) {
  const nationality = normalizeNationality(r.nationality);
  const onLoan = (r.team === 'loan' || r.onLoanTo)
    ? { to: r.onLoanTo || '', until: r.onLoanUntil || '' }
    : null;
  const payload = {
    number: (r.number != null && r.number !== '') ? Number(r.number) : null,
    enFirst: r.enFirst || '',
    enLast: r.enLast || '',
    displayName: r.displayName || r.enLast || '',
    nationality,
    position: r.position || '',
    team: r.team === 'loan' ? 'loan' : 'first',
    avatar: r.avatar || null,
    onLoan,
    source: 'manual'
  };
  const ex = findExisting(r);
  if (ex) payload.id = ex.id;
  const saved = playersApi.upsert(payload);
  if (ex) updated++; else inserted++;
  console.log(`  ${ex ? '更新' : '新增'} #${saved.number == null ? '-' : saved.number} ${saved.displayName || saved.enLast || '(无名)'}`);
}
console.log(`✅ 完成：新增 ${inserted} 名，更新 ${updated} 名`);
process.exit(0);

function normalizeNationality(n) {
  if (!n) return [];
  if (Array.isArray(n)) return n.map(x => String(x).trim()).filter(Boolean);
  return String(n).split(/[,\/]/).map(x => x.trim()).filter(Boolean);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  if (!lines.length) return [];
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const o = {};
    header.forEach((h, i) => { o[h] = cells[i]; });
    return o;
  });
}
