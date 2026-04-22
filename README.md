# 🦖 Pterodactyl Monitor - Cloudflare Worker 版

容器版性能更佳： https://github.com/fascmer/ptero-monitor

翼龙面板服务器监控保活工具，部署在 Cloudflare Worker 上，使用 KV 存储数据。

## 功能

- 📊 服务器状态监控
- 🔄 停机自动重启
- 📦 配置导出/导入备份
- ⏰ 多种触发方式（Cron / HTTP）

## 部署步骤

### 1. 创建 KV 命名空间

```bash
wrangler kv:namespace create "PTERO_KV"
```

记录返回的 `id`，填入 `wrangler.toml`

### 2. 修改配置

编辑 `wrangler.toml`，将 `id = "你的KV_ID"` 替换为实际 ID

### 3. 部署

```bash
wrangler deploy
```

### 4. 访问

部署完成后访问 `https://ptero-monitor.<你的子域>.workers.dev`

方式二：在 D1 Console 逐条粘贴
进入 Dashboard → D1 → 你的数据库 → Console，依次执行以下三条：
1
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
);
2
CREATE TABLE IF NOT EXISTS logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id  INTEGER NOT NULL,
  action     TEXT    NOT NULL,
  status     TEXT    NOT NULL,
  message    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
3
CREATE INDEX IF NOT EXISTS idx_logs_server_id ON logs (server_id);

建完后刷新页面，数据就能正常存储了。


## 手动部署（不用 wrangler）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages
3. 创建 Worker，粘贴 `index.js` 内容
4. 创建 KV 命名空间，绑定为 `PTERO_KV`
5. 设置 Cron 触发器：`* * * * *`（可选）

## 触发方式

### 1. Cron 定时触发（推荐）

在 `wrangler.toml` 中配置：
```toml
[triggers]
crons = ["* * * * *"]  # 每分钟执行
```

### 2. HTTP 请求触发

访问以下接口手动触发检查：
```
GET /api/trigger
```

返回示例：
```json
{
  "success": true,
  "message": "检查完成",
  "checked": 3,
  "restarted": 1,
  "total": 5
}
```

可配合外部监控服务（如 UptimeRobot、cron-job.org）定时请求触发。

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/servers` | GET | 获取服务器列表 |
| `/api/servers` | POST | 添加服务器 |
| `/api/servers/:id` | DELETE | 删除服务器 |
| `/api/servers/:id/toggle` | POST | 切换启用状态 |
| `/api/servers/:id/status` | GET | 获取服务器状态 |
| `/api/servers/:id/power` | POST | 电源操作 |
| `/api/logs` | GET | 获取日志 |
| `/api/backup/export` | GET | 导出备份 |
| `/api/backup/import` | POST | 导入备份 |
| `/api/trigger` | GET | 手动触发监控检查 |

## 注意事项

- Worker 免费版每天 10 万请求，KV 每天 10 万次读写
- Cron 触发器免费版每天限 1000 次（约每 1.5 分钟一次）
- 如需更高频率检查，建议使用 HTTP 触发方式
- API Key 存储在 KV 中，请确保 Worker 访问安全
