# 使用 Node.js 20
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（使用 npm install 避免 npm ci 的严格检查）
RUN npm install --production

# 复制所有文件
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
