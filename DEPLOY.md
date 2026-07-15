# MemoKeep 后端部署指南

## 部署到 Render.com

### 步骤 1：注册 Render.com 账号

1. 访问 https://render.com
2. 使用 GitHub 账号登录（推荐）或邮箱注册
3. 免费套餐足够使用

### 步骤 2：创建新服务

1. 点击 **"New +"** → **"Web Service"**
2. 选择 **"Build and deploy from a Git repository"**
3. 连接你的 GitHub 仓库（需要先 push 代码到 GitHub）

### 步骤 3：配置服务

- **Name**: `memo-keep-backend`
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `NODE_ENV=production node dist/index.js`
- **Instance Type**: `Free`

### 步骤 4：添加环境变量

在 Render  dashboard 中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `10000` | Render 默认端口 |
| `COZE_SUPABASE_URL` | 你的 Supabase URL | 从 Supabase 项目设置获取 |
| `COZE_SUPABASE_ANON_KEY` | 你的 Supabase Anon Key | 从 Supabase 项目设置获取 |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 你的 Supabase Service Role Key | 从 Supabase 项目设置获取 |

### 步骤 5：部署

1. 点击 **"Create Web Service"**
2. 等待构建和部署完成（约 5-10 分钟）
3. 部署完成后，你会获得一个 URL，如：`https://memo-keep-backend.onrender.com`

### 步骤 6：更新应用配置

1. 打开应用 → 设置
2. 输入新的后端 URL：`https://memo-keep-backend.onrender.com`
3. 测试连接 → 保存 → 重启应用

---

## 注意事项

### 免费套餐限制

- **休眠**：15 分钟无请求后服务会休眠
- **唤醒**：首次请求需要 30-60 秒唤醒
- **月度时长**：每月 750 小时免费

### 解决方案

1. **使用免费定时任务**：在 Render 上创建一个 Cron Job，每 10 分钟调用一次健康检查接口，防止休眠
2. **升级套餐**：$7/月可避免休眠

### 健康检查 Cron Job 配置

- **Name**: `memo-keep-health-check`
- **Schedule**: `*/10 * * * *`（每 10 分钟）
- **Command**: `curl https://memo-keep-backend.onrender.com/api/v1/health`

---

## 获取 Supabase 凭证

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 点击 **Settings** → **API**
4. 复制以下值：
   - **Project URL** → `COZE_SUPABASE_URL`
   - **anon public key** → `COZE_SUPABASE_ANON_KEY`
   - **service_role secret** → `COZE_SUPABASE_SERVICE_ROLE_KEY`

---

## 问题排查

### 构建失败

检查 `server/package.json` 中的依赖是否正确安装。

### 启动失败

查看 Render 日志：**Logs** 标签页查看实时日志。

### 连接超时

确保防火墙允许 Render 的 IP 访问 Supabase。
