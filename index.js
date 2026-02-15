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
  const res = await fetch('/api/servers/' + id + '/status');
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
// Pterodactyl Monitor - Cloudflare Worker Version
// 使用 KV 存储数据

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// 工具函数
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

// KV 操作封装
async function getServers(env) {
  const data = await env.PTERO_KV.get('servers', 'json');
  return data || [];
}

async function saveServers(env, servers) {
  await env.PTERO_KV.put('servers', JSON.stringify(servers));
}

async function getSettings(env) {
  const data = await env.PTERO_KV.get('settings', 'json');
  return data || {};
}

async function saveSettings(env, settings) {
  await env.PTERO_KV.put('settings', JSON.stringify(settings));
}

async function getLogs(env) {
  const data = await env.PTERO_KV.get('logs', 'json');
  return data || [];
}

async function addLog(env, serverId, action, status, message) {
  const logs = await getLogs(env);
  logs.unshift({
    id: Date.now(),
    server_id: serverId,
    action,
    status,
    message,
    created_at: new Date().toISOString()
  });
  // 只保留最近500条日志
  await env.PTERO_KV.put('logs', JSON.stringify(logs.slice(0, 500)));
}

// 翼龙 API 请求 (使用 fetch，CF Worker 原生支持)
async function fetchServerStatus(apiUrl, apiKey, serverId) {
  let baseUrl = apiUrl.replace(/\/$/, '');
  if (!serverId || serverId === '-') {
    const match = baseUrl.match(/\/([a-f0-9-]{8,})$/i);
    if (match) {
      serverId = match[1];
      baseUrl = baseUrl.replace(/\/[a-f0-9-]{8,}$/i, '');
    }
  }
  
  const url = `${baseUrl}/${serverId}/resources`;
  
  try {
    const resp = await fetch(url, {
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
    } else {
      return { success: false, error: `HTTP ${resp.status}` };
    }
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
  
  const url = `${baseUrl}/${serverId}/power`;
  
  try {
    const resp = await fetch(url, {
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

// API 路由处理
async function handleApi(request, env, path) {
  const method = request.method;
  
  // GET /api/servers - 获取服务器列表
  if (path === '/api/servers' && method === 'GET') {
    const servers = await getServers(env);
    return jsonResponse({ success: true, servers });
  }
  
  // POST /api/servers - 添加服务器
  if (path === '/api/servers' && method === 'POST') {
    const body = await request.json();
    const servers = await getServers(env);
    
    const newServer = {
      id: Date.now(),
      name: body.name || '未命名',
      api_url: body.api_url || '',
      api_key: body.api_key || '',
      server_id: body.server_id || '-',
      
      enabled: true,
      last_status: 'unknown',
      restart_count: 0,
      proxy_url: body.proxy_url || ''
    };
    
    servers.push(newServer);
    await saveServers(env, servers);
    await addLog(env, newServer.id, 'add', 'success', `添加服务器: ${newServer.name}`);
    
    return jsonResponse({ success: true, server: newServer });
  }
  
  // DELETE /api/servers/:id
  if (path.match(/^\/api\/servers\/\d+$/) && method === 'DELETE') {
    const id = parseInt(path.split('/').pop());
    let servers = await getServers(env);
    servers = servers.filter(s => s.id !== id);
    await saveServers(env, servers);
    return jsonResponse({ success: true });
  }
  
  // POST /api/servers/:id/toggle - 切换启用状态
  if (path.match(/^\/api\/servers\/\d+\/toggle$/) && method === 'POST') {
    const id = parseInt(path.split('/')[3]);
    const servers = await getServers(env);
    const server = servers.find(s => s.id === id);
    if (server) {
      server.enabled = !server.enabled;
      await saveServers(env, servers);
    }
    return jsonResponse({ success: true, enabled: server?.enabled });
  }
  
  // PUT /api/servers/:id - 更新服务器
  if (path.match(/^\/api\/servers\/\d+$/) && method === 'PUT') {
    const id = parseInt(path.split('/').pop());
    const body = await request.json();
    const servers = await getServers(env);
    const server = servers.find(s => s.id === id);
    if (server) {
      Object.assign(server, body);
      await saveServers(env, servers);
    }
    return jsonResponse({ success: true });
  }
  
  // GET /api/servers/:id/status - 获取服务器状态
  if (path.match(/^\/api\/servers\/\d+\/status$/) && method === 'GET') {
    const id = parseInt(path.split('/')[3]);
    const servers = await getServers(env);
    const server = servers.find(s => s.id === id);
    if (!server) return jsonResponse({ success: false, error: 'Not found' }, 404);
    
    const result = await fetchServerStatus(server.api_url, server.api_key, server.server_id);
    if (result.success) {
      server.last_status = result.status;
      server.last_check = new Date().toISOString();
      await saveServers(env, servers);
    }
    return jsonResponse(result);
  }
  
  // POST /api/servers/:id/power - 电源操作
  if (path.match(/^\/api\/servers\/\d+\/power$/) && method === 'POST') {
    const id = parseInt(path.split('/')[3]);
    const body = await request.json();
    const servers = await getServers(env);
    const server = servers.find(s => s.id === id);
    if (!server) return jsonResponse({ success: false, error: 'Not found' }, 404);
    
    const result = await sendPowerAction(server.api_url, server.api_key, server.server_id, body.action);
    await addLog(env, id, body.action, result.success ? 'success' : 'error', 
      result.success ? `执行 ${body.action}` : result.error);
    return jsonResponse(result);
  }
  
  // GET /api/logs - 获取日志
  if (path === '/api/logs' && method === 'GET') {
    const logs = await getLogs(env);
    return jsonResponse({ success: true, logs: logs.slice(0, 100) });
  }
  
  // GET /api/backup/export - 导出备份
  if (path === '/api/backup/export' && method === 'GET') {
    const servers = await getServers(env);
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      servers: servers.map(s => ({
        name: s.name,
        api_url: s.api_url,
        api_key: s.api_key,
        server_id: s.server_id,
        
        enabled: s.enabled,
        proxy_url: s.proxy_url || ''
      }))
    };
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ptero-backup-${Date.now()}.json"`
      }
    });
  }
  
  // POST /api/backup/import - 导入备份
  if (path === '/api/backup/import' && method === 'POST') {
    const body = await request.json();
    if (!body.servers) return jsonResponse({ success: false, error: '无效的备份文件' }, 400);
    
    const servers = await getServers(env);
    let imported = 0, skipped = 0;
    
    for (const s of body.servers) {
      const exists = servers.find(x => x.api_url === s.api_url && x.server_id === s.server_id);
      if (exists) { skipped++; continue; }
      
      servers.push({
        id: Date.now() + imported,
        name: s.name || '未命名',
        api_url: s.api_url,
        api_key: s.api_key,
        server_id: s.server_id || '-',
        
        enabled: s.enabled !== false,
        last_status: 'unknown',
        restart_count: 0,
        proxy_url: s.proxy_url || ''
      });
      imported++;
    }
    
    await saveServers(env, servers);
    return jsonResponse({ success: true, imported, skipped, message: `导入 ${imported} 个，跳过 ${skipped} 个` });
  }
  
  return jsonResponse({ error: 'Not found' }, 404);
}

// 主入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    
    // API 路由
    if (path.startsWith('/api/')) {
      return handleApi(request, env, path);
    }
    
    // 首页
    if (path === '/' || path === '/index.html') {
      return htmlResponse(HTML_PAGE);
    }
    
    return new Response('Not Found', { status: 404 });
  },
  
  // 定时任务 - 监控检查
  async scheduled(event, env, ctx) {
    const servers = await getServers(env);
    
    for (const server of servers) {
      if (!server.enabled) continue;
      
      const result = await fetchServerStatus(server.api_url, server.api_key, server.server_id);
      
      if (result.success) {
        server.last_status = result.status;
        server.last_check = new Date().toISOString();
        
        // 自动重启离线服务器
        if (result.status === 'offline') {
          await sendPowerAction(server.api_url, server.api_key, server.server_id, 'start');
          server.restart_count = (server.restart_count || 0) + 1;
          await addLog(env, server.id, 'auto_restart', 'success', '检测到离线，自动启动');
        }
      }
    }
    
    await saveServers(env, servers);
  }
};
