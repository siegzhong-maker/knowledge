#!/bin/bash

# Railway 数据迁移脚本
# 使用方法：在 Railway 环境中运行此脚本

echo "开始数据迁移到 Railway PostgreSQL..."
echo ""

# 检查本地 SQLite 数据库是否存在
SQLITE_DB="database/knowledge.db"
if [ ! -f "$SQLITE_DB" ]; then
    echo "错误: 找不到 SQLite 数据库文件: $SQLITE_DB"
    echo "请确保数据库文件存在"
    exit 1
fi

echo "✓ 找到 SQLite 数据库: $SQLITE_DB"
echo ""

# Railway 会自动设置 DATABASE_URL，直接运行迁移
echo "运行迁移脚本..."
npm run migrate-to-pg

echo ""
echo "迁移完成！"

