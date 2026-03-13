#!/bin/bash
# ─────────────────────────────────────────────
# AI Dash 服务器端部署脚本
# 由 GitHub Actions 通过 SSH 调用
# 环境变量由 GitHub Actions 注入：
#   DATABASE_URL, AUTH_SECRET, DEPLOY_DOMAIN, CERTBOT_EMAIL
# ─────────────────────────────────────────────
set -e

DEPLOY_DIR="/opt/aidash/app"
DOMAIN="${DEPLOY_DOMAIN:-ai.dashedu.net}"
EMAIL="${CERTBOT_EMAIL:-admin@dashedu.net}"

echo "▶ [1/9] 检查并安装 Node.js..."
if ! command -v node &>/dev/null || [[ "$(node -v 2>/dev/null)" < "v22" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  echo "  Node.js $(node -v) 安装完成"
else
  echo "  Node.js $(node -v) 已存在，跳过"
fi

echo "▶ [2/9] 检查并安装 PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup systemd -u root --hp /root | tail -1 | bash
  echo "  PM2 安装完成"
else
  echo "  PM2 已存在，跳过"
fi

echo "▶ [3/9] 检查并安装 Nginx..."
if ! command -v nginx &>/dev/null; then
  apt-get update -qq
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "  Nginx 安装完成"
else
  echo "  Nginx 已存在，跳过"
fi

echo "▶ [4/9] 检查并安装 Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "  Certbot 安装完成"
else
  echo "  Certbot 已存在，跳过"
fi

echo "▶ [5/9] 配置 Nginx..."
if [ ! -f /etc/nginx/sites-available/aidash ]; then
  cat > /etc/nginx/sites-available/aidash <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/aidash /etc/nginx/sites-enabled/aidash
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "  Nginx 配置完成"
else
  echo "  Nginx 已配置，跳过"
fi

echo "▶ [6/9] 申请 SSL 证书..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}"
  echo "  SSL 证书申请完成"
else
  echo "  SSL 证书已存在，跳过"
fi

echo "▶ [7/9] 写入生产环境变量..."
mkdir -p "${DEPLOY_DIR}"
cat > "${DEPLOY_DIR}/.env" <<ENV
DATABASE_URL=${DATABASE_URL}
AUTH_SECRET=${AUTH_SECRET}
NODE_ENV=production
ENV
echo "  .env 写入完成"

echo "▶ [8/9] 安装依赖 & 构建..."
cd "${DEPLOY_DIR}"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
echo "  构建完成"

echo "▶ [9/9] 启动/重载服务..."
if pm2 list | grep -q "aidash"; then
  pm2 reload "${DEPLOY_DIR}/ecosystem.config.js" --env production
else
  pm2 start "${DEPLOY_DIR}/ecosystem.config.js" --env production
fi
pm2 save
echo "  服务已启动"

echo ""
echo "✅ 部署完成：https://${DOMAIN}"
