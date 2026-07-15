# Railway.app 部署指南

## 快速开始（5 分钟）

### 步骤 1：注册 Railway

1. 访问 https://railway.app
2. 点击 **"Start a New Project"**
3. 选择 **"Login with GitHub"**（推荐）

### 步骤 2：创建项目

1. 点击 **"+ New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 授权 Railway 访问你的 GitHub 仓库
4. 选择你的仓库

### 步骤 3：配置服务

Railway 会自动检测 Node.js 项目，但需要手动配置：

1. 点击你的服务卡片
2. 进入 **"Settings"** 标签
3. 配置以下项：

#### Root Directory
```
server
```

#### Build Command
```
pnpm install && pnpm build
```

#### Start Command
```
NODE_ENV=production node dist/index.js
```

### 步骤 4：添加环境变量

在 **"Variables"** 标签页添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `${{PORT}}` | Railway 自动分配 |
| `COZE_SUPABASE_URL` | 你的 Supabase URL | 从 Supabase 获取 |
| `COZE_SUPABASE_ANON_KEY` | 你的 Supabase Anon Key | 从 Supabase 获取 |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | 你的 Supabase Service Role Key | 从 Supabase 获取 |

### 步骤 5：部署

1. 点击 **"Deploy"** 标签
2. Railway 会自动构建和部署
3. 等待 3-5 分钟
4. 部署成功后，点击 **"Generate Domain"** 获取公网 URL

### 步骤 6：获取 Supabase 凭证

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. **Settings** → **API**
4. 复制：
   - **Project URL** → `COZE_SUPABASE_URL`
   - **anon public key** → `COZE_SUPABASE_ANON_KEY`
   - **service_role secret** → `COZE_SUPABASE_SERVICE_ROLE_KEY`

### 步骤 7：更新应用

1. 复制 Railway 生成的域名（如 `https://memo-keep-backend.up.railway.app`）
2. 打开应用 → 设置
3. 输入新 URL
4. 测试连接 → 保存 → 重启

---

## Railway 免费额度

- **$5/月** 免费额度
- **不需要信用卡** 即可开始
- **不会休眠**（与 Render 不同）
- **自动 HTTPS**

### 额度计算

假设你的应用：
- 内存：512MB
- CPU：0.25 vCPU
- 运行时间：720 小时/月

月费用约：$2-3（在免费额度内）

---

## 优势 vs Render

| 特性 | Railway | Render |
|------|---------|--------|
| 休眠 | ❌ 不会休眠 | ⚠️ 15 分钟休眠 |
| 免费额度 | $5/月 | 750 小时/月 |
| 稳定性 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 部署速度 | 快 | 中等 |

---

## 问题排查

### 构建失败

查看 **Deployments** 标签页的日志，检查：
- pnpm 是否正确安装
- 依赖是否完整

### 启动失败

检查环境变量是否正确配置，特别是 Supabase 凭证。

### 连接超时

确保 Railway 域名已生成并启用。

---

## 需要帮助？

如果遇到问题，告诉我具体的错误信息，我会帮你解决！
