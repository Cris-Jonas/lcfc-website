// ================================================================
//  运行抓取：官网 -> 懂球帝 -> 关联 -> 写入 SQLite
//  用法：node src/importers/run.js
//  说明：首次运行建议在阿里云服务器上执行，并按需微调选择器。
//        若两边都抓到 0 条，不会清空现有数据（防止误删）。
// ================================================================
const { fetchLcfcSquad } = require('./lcfc');
const { fetchDongqiudiSquad } = require('./dongqiudi');
const { merge } = require('./merge');
const { playersApi } = require('../db');

(async () => {
  let lcfc = [], dqd = [];
  try {
    console.log('🔄 抓取莱斯特城官网阵容...');
    lcfc = await fetchLcfcSquad();
    console.log(`   官网抓到 ${lcfc.length} 条`);
  } catch (e) { console.error('   ❌ 官网抓取失败:', e.message); }

  try {
    console.log('🔄 抓取懂球帝阵容...');
    dqd = await fetchDongqiudiSquad();
    console.log(`   懂球帝抓到 ${dqd.length} 条`);
  } catch (e) { console.error('   ❌ 懂球帝抓取失败:', e.message); }

  if (lcfc.length === 0 && dqd.length === 0) {
    console.log('⚠️ 两边均未抓到数据，跳过写入（保留现有数据）。请检查选择器或网络。');
    process.exit(0);
  }

  const { players, unmatched } = merge(lcfc, dqd);
  console.log(`🔗 关联后生成 ${players.length} 名球员`);
  if (unmatched.length) {
    console.log(`⚠️ ${unmatched.length} 条懂球帝数据未能关联（号码/姓名对不上），建议后台手动校正：`);
    unmatched.slice(0, 10).forEach(p => console.log('   -', p.displayName, p.nationality, '号', p.number));
  }

  let saved = 0;
  for (const p of players) {
    playersApi.upsert(p);
    saved++;
  }
  console.log(`✅ 已写入/更新 ${saved} 名球员到本地数据库`);
  process.exit(0);
})();
