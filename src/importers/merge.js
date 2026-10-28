// ================================================================
//  关联逻辑：把「官网英文名+照片」与「懂球帝中文名+国籍」合并到同一球员
//  关联键：优先用球衣号码；号码缺失/冲突时按英文名回退（离线不可行则留待后台手动校正）
// ================================================================
function normalizeName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function merge(lcfcPlayers, dongqiudiPlayers) {
  // 以懂球帝按号码建索引（号码为主键）
  const dqdByNumber = {};
  for (const p of dongqiudiPlayers) {
    if (p.number != null) (dqdByNumber[p.number] ||= []).push(p);
  }
  // 以懂球帝按英文名建索引（英文名回退）
  const dqdByName = {};
  for (const p of dongqiudiPlayers) {
    if (p.enLast) (dqdByName[normalizeName(p.enLast)] ||= []).push(p);
  }

  const matchedDqd = new Set();
  const players = lcfcPlayers.map(lp => {
    let dqd = (lp.number != null && dqdByNumber[lp.number] && dqdByNumber[lp.number][0]) || null;
    if (!dqd) dqd = (dqdByName[normalizeName(lp.enLast)] && dqdByName[normalizeName(lp.enLast)][0]) || null;
    if (dqd) matchedDqd.add(dqd);

    const displayName = dqd && dqd.displayName ? dqd.displayName : (lp.enLast || '');
    return {
      number: lp.number,
      enFirst: lp.enFirst || '',
      enLast: lp.enLast || '',
      displayName,
      nationality: dqd ? dqd.nationality : ['GB'],
      position: lp.position || '',
      team: 'first',
      avatar: lp.avatar || null,
      source: 'lcfc'
    };
  });

  // 未被关联到的懂球帝条目（通常是号码对不上），单独列出供人工校正
  const unmatched = dongqiudiPlayers.filter(p => !matchedDqd.has(p));

  return { players, unmatched };
}

module.exports = { merge, normalizeName };
