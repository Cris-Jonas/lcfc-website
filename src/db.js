// ================================================================
//  SQLite 数据库层（better-sqlite3，同步 API，适合轻量服务器）
// ================================================================
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 默认使用文件库；测试环境用内存库（避免落盘 journal，适配受限沙箱）
const USE_MEMORY = process.env.LCFC_DB_MEMORY === '1';
const db = new Database(USE_MEMORY ? ':memory:' : path.join(DATA_DIR, 'lcfc.db'));
// 轻量服务器并发量低，使用默认回滚日志即可；临时表走内存，避免依赖系统临时目录
db.pragma('temp_store = MEMORY');

// ---------- 初始化表结构 ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    number        INTEGER,
    display_name  TEXT,
    first_name    TEXT,
    last_name     TEXT,
    en_first      TEXT,
    en_last       TEXT,
    position      TEXT,
    team          TEXT DEFAULT 'first',
    nationality   TEXT,            -- JSON 数组，如 ["GB","GB-SCT"]
    on_loan       TEXT,            -- JSON 对象 {to,until} 或 NULL
    avatar        TEXT,            -- 本地路径 /uploads/xxx 或外链
    source        TEXT,            -- 数据来源标记：lcfc / dongqiudi / manual
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS standings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    rank       INTEGER,
    team       TEXT,
    played     INTEGER DEFAULT 0,
    won        INTEGER DEFAULT 0,
    drawn      INTEGER DEFAULT 0,
    lost       INTEGER DEFAULT 0,
    gf         INTEGER DEFAULT 0,
    ga         INTEGER DEFAULT 0,
    gd         INTEGER DEFAULT 0,
    points     INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ---------- players 查询 ----------
function rowToPlayer(p) {
  if (!p) return null;
  return {
    id: p.id,
    number: p.number,
    displayName: p.display_name,
    firstName: p.first_name,
    lastName: p.last_name,
    enFirst: p.en_first,
    enLast: p.en_last,
    position: p.position,
    team: p.team,
    nationality: p.nationality ? safeParse(p.nationality, []) : [],
    onLoan: p.on_loan ? safeParse(p.on_loan, null) : null,
    avatar: p.avatar,
    source: p.source,
    updatedAt: p.updated_at
  };
}
function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

const stmts = {
  getAllPlayers: db.prepare('SELECT * FROM players ORDER BY number ASC'),
  getPlayer: db.prepare('SELECT * FROM players WHERE id = ?'),
  insertPlayer: db.prepare(`
    INSERT INTO players (number, display_name, first_name, last_name, en_first, en_last,
      position, team, nationality, on_loan, avatar, source)
    VALUES (@number, @display_name, @first_name, @last_name, @en_first, @en_last,
      @position, @team, @nationality, @on_loan, @avatar, @source)
  `),
  updatePlayer: db.prepare(`
    UPDATE players SET number=@number, display_name=@display_name, first_name=@first_name,
      last_name=@last_name, en_first=@en_first, en_last=@en_last, position=@position,
      team=@team, nationality=@nationality, on_loan=@on_loan, avatar=@avatar,
      source=@source, updated_at=datetime('now') WHERE id=@id
  `),
  deletePlayer: db.prepare('DELETE FROM players WHERE id = ?'),
  getStandings: db.prepare('SELECT * FROM standings ORDER BY rank ASC'),
  clearStandings: db.prepare('DELETE FROM standings'),
  insertStanding: db.prepare(`
    INSERT INTO standings (rank, team, played, won, drawn, lost, gf, ga, gd, points)
    VALUES (@rank, @team, @played, @won, @drawn, @lost, @gf, @ga, @gd, @points)
  `)
};

const playersApi = {
  list() {
    return stmts.getAllPlayers.all().map(rowToPlayer);
  },
  get(id) {
    return rowToPlayer(stmts.getPlayer.get(id));
  },
  upsert(data) {
    const payload = {
      id: data.id || undefined,
      number: data.number != null && data.number !== '' ? Number(data.number) : null,
      display_name: data.displayName || '',
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      en_first: data.enFirst || '',
      en_last: data.enLast || '',
      position: data.position || '',
      team: data.team || 'first',
      nationality: JSON.stringify(data.nationality || []),
      on_loan: data.onLoan ? JSON.stringify(data.onLoan) : null,
      avatar: data.avatar || null,
      source: data.source || 'manual'
    };
    if (payload.id) {
      stmts.updatePlayer.run(payload);
      return this.get(payload.id);
    }
    const info = stmts.insertPlayer.run(payload);
    return this.get(info.lastInsertRowid);
  },
  remove(id) {
    const p = this.get(id);
    stmts.deletePlayer.run(id);
    return p;
  }
};

const standingsApi = {
  list() { return stmts.getStandings.all(); },
  replaceAll(rows) {
    const tx = db.transaction((items) => {
      stmts.clearStandings.run();
      for (const r of items) {
        stmts.insertStanding.run({
          rank: r.rank, team: r.team, played: r.played || 0, won: r.won || 0,
          drawn: r.drawn || 0, lost: r.lost || 0, gf: r.gf || 0, ga: r.ga || 0,
          gd: r.gd || 0, points: r.points || 0
        });
      }
    });
    tx(rows);
  }
};

module.exports = { db, playersApi, standingsApi };
