#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🚀 STARTING SERVER SETUP...${NC}"

# 1. Update System
echo -e "${GREEN}📦 Updating system...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y curl git unzip build-essential nginx mysql-server

# 2. Install Node.js 20
echo -e "${GREEN}🟢 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 3. Secure MySQL
echo -e "${GREEN}🗄️ Configuring MySQL...${NC}"
systemctl start mysql
# Set root password to 'RootPass123!' (Change this!)
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'RootPass123!';" || true
mysql -e "FLUSH PRIVILEGES;"

# 4. Configure Firewall
echo -e "${GREEN}🛡️ Setting up Firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable

# 5. Create App Directory
echo -e "${GREEN}📂 Creating App Directory...${NC}"
mkdir -p /var/www/pms
chown -R root:root /var/www/pms

echo -e "${GREEN}🎉 Setup Complete!${NC}"
