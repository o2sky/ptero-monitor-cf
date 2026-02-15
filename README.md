# 🦖 Pterodactyl Monitor - Cloudflare Worker 版

翼龙面板服务器监控保活工具，部署在 Cloudflare Worker 上，使用 KV 存储数据。

## 功能

- 📊 服务器状态监控
- 🔄 停机自动重启
- 📦 配置导出/导入备份
- ⏰ 定时检测（每分钟）

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

## 手动部署（不用 wrangler）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages
3. 创建 Worker，粘贴 `index.js` 内容
4. 创建 KV 命名空间，绑定为 `PTERO_KV`
5. 设置 Cron 触发器：`* * * * *`

## 注意事项

- Worker 免费版每天 10 万请求，KV 每天 10 万次读写
- 定时任务免费版每天 1000 次调用
- API Key 存储在 KV 中，请确保 Worker 访问安全
