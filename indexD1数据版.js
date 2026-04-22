const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>翼龙面板监控 - CF Worker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { text-align: center; color: #00d4ff; margin-bottom: 20px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #16213e; padding: 20px; border-radius: 10px; text-align: center; }
    .stat-card .num { font-size: 32px; font-weight: bold; color: #00d4ff; }
    .stat-card .label { color: #888; font-size: 14px; }
    .panel { background: #16213e; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .panel h3 { color: #00d4ff; margin-bottom: 15px; }
    .form-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .form-row input { flex: 1; min-width: 150px; padding: 10px; border: 1px solid #333; border-radius: 5px; background: #0f0f23; color: #fff; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #00d4ff; color: #000; }
    .btn-success { background: #00c853; color: #fff; }
    .btn-danger { background: #ff1744; color: #fff; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .server-item { background: #0f3460; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .server-info { flex: 1; }
    .server-name { font-weight: bold; font-size: 16px; }
    .server-status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    .status-running { background: #00c853; }
    .status-offline { background: #ff1744; }
    .status-unknown { background: #666; }
    .server-actions { display: flex; gap: 5px; flex-wrap: wrap; }
    .toggle { width: 50px; height: 26px; background: #333; border-radius: 13px; position: relative; cursor: pointer; }
    .toggle.on { background: #00c853; }
    .toggle::after { content: ''; position: absolute; width: 22px; height: 22px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: .2s; }
    .toggle.on::after { left: 26px; }
    .empty { text-align: center; color: #666; padding: 40px; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.8); justify-content: center; align-items: center; z-index: 100; }
    .modal.show { display: flex; }
    .modal-content { background: #16213e; padding: 25px; border-radius: 10px; width: 90%; max-width: 500px; }
    .modal h3 { margin-bottom: 15px; color: #00d4ff; }
    .backup-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦖 翼龙面板监控</h1>
    
    <div class="stats">
      <div class="stat-card"><div class="num" id="stat-total">0</div><div class="label">监控服务器</div></div>
      <div class="stat-card"><div class="num" id="stat-online">0</div><div class="label">在线</div></div>
      <div class="stat-card"><div class="num" id="stat-offline">0</div><div class="label">离线</div></div>
      <div class="stat-card"><div class="num" id="stat-restarts">0</div><div class="label">自动重启</div></div>
    </div>
    
    <div class="panel">
      <h3>➕ 添加服务器</h3>
      <div class="form-row">
        <input type="text" id="add-name" placeholder="服务器名称">
        <input type="text" id="add-url" placeholder="API地址 (含服务器ID)">
        <input type="text" id="add-key" placeholder="API Key">
      </div>
      <button class="btn btn-primary" onclick="addServer()">添加服务器</button>
      <button class="btn btn-success" onclick="showBackup()">📦 备份管理</button>
    </div>
    
    <div class="panel">
      <h3>📋 监控列表</h3>
      <div id="server-list"><div class="empty">暂无服务器</div></div>
    </div>
  </div>
  
  <div class="modal" id="backup-modal">
    <div class="modal-content">
      <h3>📦 备份管理</h3>
      <p style="color:#888;margin-bottom:15px;">导出/导入服务器配置</p>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="exportBackup()">📤 导出备份</button>
        <button class="btn btn-success" onclick="document.getElementById('import-file').click()">📥 导入备份</button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importBackup(this)">
      </div>
      <p id="backup-msg" style="margin-top:10px;color:#888;"></p>
      <button class="btn" style="margin-top:20px;" onclick="hideBackup()">关闭</button>
    </div>
  </div>

<script>
let servers = [];

async function fetchServers() {
  try {
    const res = await fetch('/api/servers');
    const data = await res.json();
    if (data.success) { servers = data.servers; render(); }
  } catch(e) { console.error(e); }
}

function render() {
  const el = document.getElementById('server-list');
  if (!servers.length) { el.innerHTML = '<div class="empty">暂无服务器</div>'; updateStats(); return; }
  
  el.innerHTML = servers.map(s => \`
    <div class="server-item">
      <div class="server-info">
        <span class="server-name">\${s.name}</span>
        <span class="server-status status-\${s.last_status || 'unknown'}">\${s.last_status || '未知'}</span>
      </div>
      <div class="server-actions">
        <button class="btn btn-sm btn-primary" onclick="checkStatus(\${s.id})">刷新</button>
        <button class="btn btn-sm btn-success" onclick="power(\${s.id},'start')">启动</button>
        <button class="btn btn-sm btn-danger" onclick="power(\${s.id},'stop')">停止</button>
        <button class="btn btn-sm" onclick="power(\${s.id},'restart')">重启</button>
        <div class="toggle \${s.enabled ? 'on' : ''}" onclick="toggle(\${s.id})"></div>
        <button class="btn btn-sm btn-danger" onclick="del(\${s.id})">删除</button>
      </div>
    </div>
  \`).join('');
  updateStats();
}

function updateStats() {
  document.getElementById('stat-total').textContent = servers.length;
  document.getElementById('stat-online').textContent = servers.filter(s => s.last_status === 'running').length;
  document.getElementById('stat-offline').textContent = servers.filter(s => s.last_status === 'offline').length;
  document.getElementById('stat-restarts').textContent = servers.reduce((a, s) => a + (s.restart_count || 0), 0);
}

async function addServer() {
  const name = document.getElementById('add-name').value;
  const api_url = document.getElementById('add-url').value;
  const api_key = document.getElementById('add-key').value;
  
  if (!api_url || !api_key) { alert('请填写API地址和Key'); return; }
  
  await fetch('/api/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, api_url, api_key })
  });
  document.getElementById('add-name').value = '';
  document.getElementById('add-url').value = '';
  document.getElementById('add-key').value = '';
  fetchServers();
}

async function del(id) {
  if (!confirm('确定删除？')) return;
  await fetch('/api/servers/' + id, { method: 'DELETE' });
  fetchServers();
}

async function toggle(id) {
  await fetch('/api/servers/' + id + '/toggle', { method: 'POST' });
  fetchServers();
}

async function checkStatus(id) {
  await fetch('/api/servers/' + id + '/status');
  fetchServers();
}

async function power(id, action) {
  await fetch('/api/servers/' + id + '/power', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  setTimeout(fetchServers, 1000);
}

function showBackup() { document.getElementById('backup-modal').classList.add('show'); }
function hideBackup() { document.getElementById('backup-modal').classList.remove('show'); }

async function exportBackup() {
  const res = await fetch('/api/backup/export');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ptero-backup.json';
  a.click(); URL.revokeObjectURL(url);
  document.getElementById('backup-msg').textContent = '✅ 导出成功';
}

async function importBackup(input) {
  const file = input.files[0]; if (!file) return;
  const text = await file.text();
  const res = await fetch('/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text
  });
  const data = await res.json();
  document.getElementById('backup-msg').textContent = data.success ? '✅ ' + data.message : '❌ ' + data.error;
  input.value = '';
  fetchServers();
}

fetchServers();
setInterval(fetchServers, 30000);
</script>
</body>
</html>`;

export { HTML_PAGE };

// Pterodactyl Monitor - Cloudflare Worker (D1 版本)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ──────────────────────────────────────────────
// D1 初始化：建表（首次运行自动执行）
// ──────────────────────────────────────────────
// D1 不支持 exec() 执行多条语句，改用 batch() 分开提交
async function initDB(env) {
  await env.PTERO_DB.batch([
    env.PTERO_DB.prepare(`
      CREATE TABLE IF NOT EXISTS servers (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT    NOT NULL DEFAULT '未命名',
        api_url       TEXT    NOT NULL DEFAULT '',
        api_key       TEXT    NOT NULL DEFAULT '',
        server_id     TEXT    NOT NULL DEFAULT '-',
        proxy_url     TEXT    NOT NULL DEFAULT '',
        enabled       INTEGER NOT NULL DEFAULT 1,
        last_status   TEXT    NOT NULL DEFAULT 'unknown',
        last_check    TEXT,
        restart_count INTEGER NOT NULL DEFAULT 0
      )
    `),
    env.PTERO_DB.prepare(`
      CREATE TABLE IF NOT EXISTS logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id  INTEGER NOT NULL,
        action     TEXT    NOT NULL,
        status     TEXT    NOT NULL,
        message    TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.PTERO_DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_server_id ON logs (server_id)
    `),
    env.PTERO_DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs (created_at DESC)
    `)
  ]);
}

// ──────────────────────────────────────────────
// D1 封装：服务器 CRUD
// ──────────────────────────────────────────────
async function getServers(env) {
  const { results } = await env.PTERO_DB.prepare(
    'SELECT * FROM servers ORDER BY id ASC'
  ).all();
  // D1 以 0/1 存 boolean，统一转换
  return results.map(normalizeServer);
}

async function getServerById(env, id) {
  const row = await env.PTERO_DB.prepare(
    'SELECT * FROM servers WHERE id = ?'
  ).bind(id).first();
  return row ? normalizeServer(row) : null;
}

function normalizeServer(row) {
  return { ...row, enabled: !!row.enabled };
}

async function addLog(env, serverId, action, status, message) {
  await env.PTERO_DB.prepare(
    'INSERT INTO logs (server_id, action, status, message) VALUES (?, ?, ?, ?)'
  ).bind(serverId, action, status, message ?? '').run();

  // 只保留最近 500 条
  await env.PTERO_DB.prepare(`
    DELETE FROM logs WHERE id NOT IN (
      SELECT id FROM logs ORDER BY id DESC LIMIT 500
    )
  `).run();
}

// ──────────────────────────────────────────────
// 翼龙 API 请求
// ──────────────────────────────────────────────
async function fetchServerStatus(apiUrl, apiKey, serverId) {
  let baseUrl = apiUrl.replace(/\/$/, '');
  if (!serverId || serverId === '-') {
    const match = baseUrl.match(/\/([a-f0-9-]{8,})$/i);
    if (match) {
      serverId = match[1];
      baseUrl = baseUrl.replace(/\/[a-f0-9-]{8,}$/i, '');
    }
  }

  try {
    const resp = await fetch(`${baseUrl}/${serverId}/resources`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        success: true,
        status: data.attributes?.current_state || 'unknown',
        resources: data.attributes || {}
      };
    }
    return { success: false, error: `HTTP ${resp.status}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendPowerAction(apiUrl, apiKey, serverId, action) {
  let baseUrl = apiUrl.replace(/\/$/, '');
  if (!serverId || serverId === '-') {
    const match = baseUrl.match(/\/([a-f0-9-]{8,})$/i);
    if (match) {
      serverId = match[1];
      baseUrl = baseUrl.replace(/\/[a-f0-9-]{8,}$/i, '');
    }
  }

  try {
    const resp = await fetch(`${baseUrl}/${serverId}/power`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ signal: action })
    });
    return { success: resp.ok };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ──────────────────────────────────────────────
// API 路由
// ──────────────────────────────────────────────
async function handleApi(request, env, path) {
  const method = request.method;

  // GET /api/servers
  if (path === '/api/servers' && method === 'GET') {
    const servers = await getServers(env);
    return jsonResponse({ success: true, servers });
  }

  // POST /api/servers
  if (path === '/api/servers' && method === 'POST') {
    const body = await request.json();
    const { meta } = await env.PTERO_DB.prepare(`
      INSERT INTO servers (name, api_url, api_key, server_id, proxy_url)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      body.name || '未命名',
      body.api_url || '',
      body.api_key || '',
      body.server_id || '-',
      body.proxy_url || ''
    ).run();

    const newId = meta.last_row_id;
    await addLog(env, newId, 'add', 'success', `添加服务器: ${body.name || '未命名'}`);
    const server = await getServerById(env, newId);
    return jsonResponse({ success: true, server });
  }

  // DELETE /api/servers/:id
  if (path.match(/^\/api\/servers\/\d+$/) && method === 'DELETE') {
    const id = parseInt(path.split('/').pop());
    await env.PTERO_DB.prepare('DELETE FROM servers WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  // PUT /api/servers/:id
  if (path.match(/^\/api\/servers\/\d+$/) && method === 'PUT') {
    const id = parseInt(path.split('/').pop());
    const body = await request.json();
    // 只允许更新这几个字段，防止意外覆盖
    const fields = ['name', 'api_url', 'api_key', 'server_id', 'proxy_url', 'enabled'];
    const updates = fields.filter(f => f in body);
    if (updates.length) {
      const set = updates.map(f => `${f} = ?`).join(', ');
      const vals = updates.map(f => f === 'enabled' ? (body[f] ? 1 : 0) : body[f]);
      await env.PTERO_DB.prepare(`UPDATE servers SET ${set} WHERE id = ?`)
        .bind(...vals, id).run();
    }
    return jsonResponse({ success: true });
  }

  // POST /api/servers/:id/toggle
  if (path.match(/^\/api\/servers\/\d+\/toggle$/) && method === 'POST') {
    const id = parseInt(path.split('/')[3]);
    const server = await getServerById(env, id);
    if (!server) return jsonResponse({ success: false, error: 'Not found' }, 404);
    const next = server.enabled ? 0 : 1;
    await env.PTERO_DB.prepare('UPDATE servers SET enabled = ? WHERE id = ?').bind(next, id).run();
    return jsonResponse({ success: true, enabled: !!next });
  }

  // GET /api/servers/:id/status
  if (path.match(/^\/api\/servers\/\d+\/status$/) && method === 'GET') {
    const id = parseInt(path.split('/')[3]);
    const server = await getServerById(env, id);
    if (!server) return jsonResponse({ success: false, error: 'Not found' }, 404);

    const result = await fetchServerStatus(server.api_url, server.api_key, server.server_id);
    if (result.success) {
      await env.PTERO_DB.prepare(
        'UPDATE servers SET last_status = ?, last_check = ? WHERE id = ?'
      ).bind(result.status, new Date().toISOString(), id).run();
    }
    return jsonResponse(result);
  }

  // POST /api/servers/:id/power
  if (path.match(/^\/api\/servers\/\d+\/power$/) && method === 'POST') {
    const id = parseInt(path.split('/')[3]);
    const body = await request.json();
    const server = await getServerById(env, id);
    if (!server) return jsonResponse({ success: false, error: 'Not found' }, 404);

    const result = await sendPowerAction(server.api_url, server.api_key, server.server_id, body.action);
    await addLog(env, id, body.action,
      result.success ? 'success' : 'error',
      result.success ? `执行 ${body.action}` : result.error
    );
    return jsonResponse(result);
  }

  // GET /api/logs
  if (path === '/api/logs' && method === 'GET') {
    const { results } = await env.PTERO_DB.prepare(
      'SELECT * FROM logs ORDER BY id DESC LIMIT 100'
    ).all();
    return jsonResponse({ success: true, logs: results });
  }

  // GET /api/backup/export
  if (path === '/api/backup/export' && method === 'GET') {
    const servers = await getServers(env);
    const backup = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      servers: servers.map(s => ({
        name: s.name,
        api_url: s.api_url,
        api_key: s.api_key,
        server_id: s.server_id,
        proxy_url: s.proxy_url,
        enabled: s.enabled
      }))
    };
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ptero-backup-${Date.now()}.json"`
      }
    });
  }

  // POST /api/backup/import
  if (path === '/api/backup/import' && method === 'POST') {
    const body = await request.json();
    if (!body.servers) return jsonResponse({ success: false, error: '无效的备份文件' }, 400);

    const existing = await getServers(env);
    let imported = 0, skipped = 0;

    // 批量插入（D1 支持批处理）
    const stmts = [];
    for (const s of body.servers) {
      const dup = existing.find(x => x.api_url === s.api_url && x.server_id === (s.server_id || '-'));
      if (dup) { skipped++; continue; }
      stmts.push(
        env.PTERO_DB.prepare(`
          INSERT INTO servers (name, api_url, api_key, server_id, proxy_url, enabled)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          s.name || '未命名',
          s.api_url || '',
          s.api_key || '',
          s.server_id || '-',
          s.proxy_url || '',
          s.enabled !== false ? 1 : 0
        )
      );
      imported++;
    }

    if (stmts.length) await env.PTERO_DB.batch(stmts);
    return jsonResponse({ success: true, imported, skipped, message: `导入 ${imported} 个，跳过 ${skipped} 个` });
  }

  // GET /api/trigger
  if (path === '/api/trigger' && method === 'GET') {
    const result = await runMonitorCheck(env);
    return jsonResponse({ success: true, message: '检查完成', ...result });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ──────────────────────────────────────────────
// 定时监控检查
// ──────────────────────────────────────────────
async function runMonitorCheck(env) {
  const servers = await getServers(env);
  let checked = 0, restarted = 0;

  for (const server of servers) {
    if (!server.enabled) continue;

    const result = await fetchServerStatus(server.api_url, server.api_key, server.server_id);
    checked++;

    if (result.success) {
      const now = new Date().toISOString();

      if (result.status === 'offline') {
        await sendPowerAction(server.api_url, server.api_key, server.server_id, 'start');
        await env.PTERO_DB.prepare(`
          UPDATE servers
          SET last_status = ?, last_check = ?, restart_count = restart_count + 1
          WHERE id = ?
        `).bind(result.status, now, server.id).run();
        await addLog(env, server.id, 'auto_restart', 'success', '检测到离线，自动启动');
        restarted++;
      } else {
        await env.PTERO_DB.prepare(
          'UPDATE servers SET last_status = ?, last_check = ? WHERE id = ?'
        ).bind(result.status, now, server.id).run();
      }
    }
  }

  return { checked, restarted, total: servers.length };
}

// ──────────────────────────────────────────────
// 主入口
// ──────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // 确保表已存在
    await initDB(env);

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (path.startsWith('/api/')) {
      return handleApi(request, env, path);
    }

    if (path === '/' || path === '/index.html') {
      return htmlResponse(HTML_PAGE);
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    await initDB(env);
    await runMonitorCheck(env);
  }
};
