const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const JWT_SECRET = process.env.JWT_SECRET;

function auth(req) {
  const h = req.headers.authorization;
  if (!h) return false;
  try {
    jwt.verify(h.split(' ')[1], JWT_SECRET);
    return true;
  } catch { return false; }
}

async function getBody(req) {
  if (req.body && Object.keys(req.body).length > 0) return req.body;
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => {
      try { resolve(JSON.parse(d)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('players').select('*');
    if (error) return res.status(500).json({ error: error.message });
    const players = data.map(p => ({
      id: p.id,
      number: p.number,
      displayName: p.display_name,
      firstName: p.first_name,
      lastName: p.last_name,
      enFirst: p.en_first,
      enLast: p.en_last,
      position: p.position,
      team: p.team,
      nationality: p.nationality,
      onLoan: p.on_loan,
      avatar: p.avatar,
      // ====== 新增字段 ======
      birthDate: p.birthdate || '',
      currentValue: p.current_value || null,
      valueHistory: p.value_history || []
    }));
    return res.json(players);
  }

  if (req.method === 'POST') {
    if (!auth(req)) return res.status(401).json({ error: '未授权' });
    const b = await getBody(req);

    let avatarUrl = b.avatar || null;
    if (avatarUrl && avatarUrl.startsWith('data:image')) {
      try {
        const base64 = avatarUrl.split(',')[1];
        const mime = avatarUrl.match(/data:(.*?);base64/)[1];
        const ext = mime.split('/')[1] || 'png';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(filename, Buffer.from(base64, 'base64'), { contentType: mime });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
          avatarUrl = urlData.publicUrl;
        }
      } catch (e) { console.error('头像上传失败', e); }
    }

    // ====== 解析 valueHistory（可能从 FormData 传来的是字符串） ======
    let valueHistory = b.valueHistory || [];
    if (typeof valueHistory === 'string') {
      try { valueHistory = JSON.parse(valueHistory); } catch { valueHistory = []; }
    }

    const row = {
      number: b.number ? parseInt(b.number) : null,
      display_name: b.displayName || '',
      first_name: b.firstName || '',
      last_name: b.lastName || '',
      en_first: b.enFirst || '',
      en_last: b.enLast || '',
      position: b.position || '',
      team: b.team || 'first',
      nationality: b.nationality || ['GB'],
      on_loan: b.onLoan || null,
      avatar: avatarUrl,
      // ====== 新增字段 ======
      birthdate: b.birthDate || '',
      current_value: b.currentValue ? parseInt(b.currentValue) : null,
      value_history: valueHistory
    };

    if (b.id) {
      const { data, error } = await supabase.from('players').update(row).eq('id', b.id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, player: data?.[0] });
    } else {
      // 新建球员时，生成一个 id（使用时间戳）
      const newId = Date.now().toString();
      row.id = newId;
      const { data, error } = await supabase.from('players').insert(row).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, player: data?.[0] });
    }
  }

  if (req.method === 'DELETE') {
    if (!auth(req)) return res.status(401).json({ error: '未授权' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: '缺少 id' });

    const { data: p } = await supabase.from('players').select('avatar').eq('id', id).single();
    if (p?.avatar) {
      const name = p.avatar.split('/').pop();
      await supabase.storage.from('avatars').remove([name]);
    }

    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};