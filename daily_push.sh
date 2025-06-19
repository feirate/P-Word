#!/bin/bash

# P-Word 每日Git推送脚本
# 用于每天将本地提交推送到远程仓库

# 获取当前日期
DATE=$(date '+%Y-%m-%d')
BRANCH=$(git branch --show-current)

echo "🚀 开始每日推送 - $DATE"
echo "📍 当前分支：$BRANCH"

# 检查是否有未推送的提交
UNPUSHED=$(git log origin/$BRANCH..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')

if [ "$UNPUSHED" -eq 0 ]; then
    echo "📍 没有未推送的提交"
    exit 0
fi

echo "📦 发现 $UNPUSHED 个未推送的提交"

# 显示今日的提交
echo "📝 今日提交记录："
git log --since="00:00:00" --until="23:59:59" --oneline

# 推送到远程仓库
echo "🔄 正在推送到远程仓库..."
git push origin $BRANCH

if [ $? -eq 0 ]; then
    echo "✅ 推送成功！"
    echo "🌐 远程仓库已更新"
else
    echo "❌ 推送失败，请检查网络连接或远程仓库权限"
    exit 1
fi 