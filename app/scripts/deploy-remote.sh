#!/bin/bash
# ─────────────────────────────────────────────
# AI Dash 服务器端部署脚本
# 由 GitHub Actions 通过 SSH 调用
# 环境变量由 GitHub Actions 注入：
#   DATABASE_URL, AUTH_SECRET, DEPLOY_DOMAIN, CERTBOT_EMAIL
# ─────────────────────────────────────────────
set -e

DEPLOY_DIR="/opt/aidash/app"
UPLOADS_DIR="/opt/aidash/uploads/course-packages"
DOMAIN="${DEPLOY_DOMAIN:-ai.dashedu.net}"
EMAIL="${CERTBOT_EMAIL:-admin@dashedu.net}"

# ── [1/9] Node.js ──────────────────────────────────────────────────────────
echo "▶ [1/9] Node.js..."
if ! command -v node &>/dev/null || [[ "$(node -v)" < "v22" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
  echo "  安装完成：$(node -v)"
else
  echo "  已存在：$(node -v)，跳过"
fi

# ── [2/9] PM2 ──────────────────────────────────────────────────────────────
echo "▶ [2/9] PM2..."
command -v pm2 || npm install -g pm2
if ! systemctl is-enabled pm2-root &>/dev/null; then
  pm2 startup systemd -u root --hp /root | tail -1 | bash
fi
echo "  PM2 就绪"

# ── [3/9] Nginx ────────────────────────────────────────────────────────────
echo "▶ [3/9] Nginx..."
if ! command -v nginx &>/dev/null; then
  apt-get update -qq
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "  安装完成"
else
  echo "  已存在，跳过"
fi

# ── [4/9] Certbot ──────────────────────────────────────────────────────────
echo "▶ [4/9] Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "  安装完成"
else
  echo "  已存在，跳过"
fi

# ── [5/9] Nginx 配置 ───────────────────────────────────────────────────────
echo "▶ [5/9] Nginx 配置..."
if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  # SSL 证书已存在，写入完整 HTTPS 配置
  cat > /etc/nginx/sites-available/aidash <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 60m;

    # SSE + 图片生成等长耗时端点：关闭缓冲，延长超时
    location ~ ^/api/course-rnd/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 180s;
    }

    location / {
        proxy_pass http://localhost:3002;
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
else
  # 尚无证书，写入 HTTP 配置，等 certbot 申请后自动升级
  cat > /etc/nginx/sites-available/aidash <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 60m;

    location ~ ^/api/course-rnd/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 180s;
    }

    location / {
        proxy_pass http://localhost:3002;
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
fi
ln -sf /etc/nginx/sites-available/aidash /etc/nginx/sites-enabled/aidash
nginx -t && systemctl reload nginx
echo "  配置完成"

# ── [6/9] SSL 证书 ─────────────────────────────────────────────────────────
echo "▶ [6/9] SSL 证书..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}"
  echo "  申请完成"
else
  echo "  已存在，跳过"
fi

# ── [7/9] 写入 .env ────────────────────────────────────────────────────────
echo "▶ [7/9] 写入 .env..."
mkdir -p "${DEPLOY_DIR}"
mkdir -p "${UPLOADS_DIR}"
cat > "${DEPLOY_DIR}/.env" <<ENV
DATABASE_URL=${DATABASE_URL}
AUTH_SECRET=${AUTH_SECRET}
AUTH_TRUST_HOST=true
AUTH_URL=https://${DOMAIN}
NODE_ENV=production
UPLOADS_DIR=${UPLOADS_DIR}
ENV
echo "  写入完成"

# ── [8/9] 安装依赖 & 构建 ──────────────────────────────────────────────────
echo "▶ [8/9] 安装依赖 & 构建..."
cd "${DEPLOY_DIR}"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run seed
export DATABASE_URL="${DATABASE_URL}"
export AUTH_SECRET="${AUTH_SECRET}"
export NODE_ENV="production"
rm -rf .next
npm run build
echo "  构建完成"

# ── [9/9] 启动/重载 PM2 ────────────────────────────────────────────────────
echo "▶ [9/9] 启动服务..."
if pm2 list | grep -q "aidash"; then
  pm2 delete aidash
fi
pm2 start "${DEPLOY_DIR}/ecosystem.config.js" --env production
pm2 save
echo "  服务就绪"

echo ""
echo "✅ 部署完成：https://${DOMAIN}"
