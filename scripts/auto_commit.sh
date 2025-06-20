#!/bin/bash

# P-Word 自动Git提交脚本
# 用于每次代码修改后自动提交到本地仓库

# 获取当前时间
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE=$(date '+%Y-%m-%d')

# 检查是否有变更
if [ -z "$(git status --porcelain)" ]; then
    echo "📍 没有发现代码变更，无需提交"
    exit 0
fi

# 添加所有变更到暂存区
git add .

# 检查是否有暂存的变更
if [ -z "$(git diff --cached --name-only)" ]; then
    echo "📍 没有暂存的变更"
    exit 0
fi

# 生成提交信息
CHANGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')
COMMIT_MSG="🔄 自动提交 - $TIMESTAMP ($CHANGED_FILES 个文件变更)"

# 提交到本地仓库
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo "✅ 自动提交成功：$COMMIT_MSG"
    echo "📁 变更文件："
    git diff --name-only HEAD~1
else
    echo "❌ 提交失败"
    exit 1
fi 