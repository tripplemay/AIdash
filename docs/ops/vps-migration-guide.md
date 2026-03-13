# VPS 迁移方案

> 创建于：2026-03-13
> 迁移范围：应用服务器（新 VPS）；数据库（腾讯云 TDSQL-C）不动

---

## 前提假设

| 项目 | 说明 |
|------|------|
| 应用部署路径 | `/opt/aidash/app` |
| 进程管理 | PM2 |
| 反向代理 | Nginx |
| SSL | Let's Encrypt (certbot) |
| 代码来源 | GitHub（git clone） |
| 数据库 | 腾讯云 TDSQL-C，连接串不变，无需迁移 |

---

## 迁移步骤

### 阶段一：准备新 VPS

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js（建议 20.x LTS，与旧服务器保持一致）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 PM2
sudo npm install -g pm2

# 4. 安装 Nginx
sudo apt install -y nginx

# 5. 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 6. 安装 git
sudo apt install -y git

# 验证版本
node -v && npm -v && pm2 -v && nginx -v
```

### 阶段二：拉取代码并构建

```bash
# 1. 创建部署目录
sudo mkdir -p /opt/aidash
sudo chown $USER:$USER /opt/aidash

# 2. clone 代码
cd /opt/aidash
git clone https://github.com/<your-org>/<your-repo>.git app
cd app

# 3. 创建生产环境变量文件（从旧服务器复制或手动填写）
cp .env.example .env.production
# 编辑填入真实值：
#   DATABASE_URL="postgresql://..."   ← 腾讯云 TDSQL-C 连接串（与旧服务器相同）
#   AUTH_SECRET="..."                 ← 与旧服务器相同
#   NODE_ENV="production"
nano .env.production

# 4. 安装依赖
npm ci

# 5. 生成 Prisma Client
npx prisma generate

# 6. 构建 Next.js
npm run build
```

> **注意**：数据库已有数据，**不要执行** `prisma migrate deploy`，除非有新的 schema 变更需要同步。

### 阶段三：启动应用

```bash
# 使用项目中的 ecosystem.config.js 启动 PM2
# 注意：ecosystem.config.js 中 cwd 路径为 /opt/aidash/app，需确认一致
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 save
pm2 startup
# 按提示执行输出的 sudo 命令

# 验证应用运行
pm2 status
curl http://localhost:3000
```

### 阶段四：配置 Nginx

```bash
# 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/aidash
```

填入以下内容（先用 HTTP，SSL 在下一步处理）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/aidash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 阶段五：申请 SSL 证书

```bash
# 先将域名 DNS 解析指向新服务器 IP（或在本步骤前用旧 IP 测试）
# DNS 切换后执行：
sudo certbot --nginx -d your-domain.com

# certbot 会自动修改 Nginx 配置，添加 SSL 及 HTTP→HTTPS 重定向
sudo systemctl reload nginx
```

### 阶段六：验证（DNS 切换前的预检）

在本地 `/etc/hosts` 临时绑定新服务器 IP，验证新环境：

```
# /etc/hosts（临时添加，验证完删除）
<新服务器IP>  your-domain.com
```

逐项验证：
- [ ] 登录页正常加载
- [ ] 可以登录（NextAuth 认证通过）
- [ ] 课程包列表正常（数据库读取正常）
- [ ] 课程包详情页正常
- [ ] "进入本课"新标签打开正常
- [ ] HTTPS 证书有效

### 阶段七：切换 DNS

1. 登录域名 DNS 控制台
2. 将 A 记录从旧服务器 IP 改为新服务器 IP
3. 等待 DNS 生效（TTL 时间，通常 5 分钟～1 小时）
4. 生效后删除本地 `/etc/hosts` 临时记录
5. 再次全流程验证

### 阶段八：旧服务器善后

确认新服务器稳定运行 **至少 24 小时**后，再处理旧服务器：

```bash
# 旧服务器上停止服务
pm2 stop aidash
pm2 delete aidash
```

然后根据需要决定是否释放旧 VPS 实例。

---

## 环境变量迁移清单

从旧服务器 `/opt/aidash/app/.env.production`（或等效路径）复制以下变量到新服务器：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 腾讯云 TDSQL-C 连接串，保持不变 |
| `AUTH_SECRET` | NextAuth 密钥，保持不变（保证会话连续性） |
| `NODE_ENV` | `production` |

---

## 回滚方案

如果新服务器出现问题：

1. 将 DNS A 记录切回旧服务器 IP
2. 旧服务器重新启动：`pm2 start ecosystem.config.js`
3. 恢复时间 = DNS TTL（建议迁移前将 TTL 临时调低至 60 秒）

---

## 注意事项

- 迁移前建议将域名 DNS TTL 调低至 60 秒，便于快速切换/回滚
- `AUTH_SECRET` 必须与旧服务器一致，否则已登录用户的 Session 会失效
- 腾讯云 TDSQL-C 需要将新服务器 IP 加入**安全组/白名单**，否则数据库连接会被拒绝
