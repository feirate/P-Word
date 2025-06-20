#!/bin/bash
# 启动带调试模式的微信开发者工具

echo "🚀 启动微信开发者工具（调试模式）"

# 找到微信开发者工具的安装路径
DEVTOOLS_PATH=""
POSSIBLE_PATHS=(
    "/Applications/wechatwebdevtools.app/Contents/MacOS/wechatwebdevtools"
    "/Applications/微信开发者工具.app/Contents/MacOS/wechatwebdevtools"
    "/Applications/wechatwebdevtools.app/Contents/MacOS/wechatdevtools"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        DEVTOOLS_PATH="$path"
        echo "✅ 找到微信开发者工具: $path"
        break
    fi
done

if [ -z "$DEVTOOLS_PATH" ]; then
    echo "❌ 未找到微信开发者工具，请确保已安装"
    exit 1
fi

# 关闭现有的微信开发者工具进程
echo "🔄 关闭现有进程..."
pkill -f "wechatwebdevtools" 2>/dev/null || true
pkill -f "wechatdevtools" 2>/dev/null || true
sleep 2

# 启动调试模式
echo "🔧 启动调试模式（端口9222）..."
"$DEVTOOLS_PATH" \
    --remote-debugging-port=9222 \
    --enable-logging \
    --log-level=0 \
    --disable-features=VizDisplayCompositor \
    --project="/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word" &

# 等待启动
echo "⏳ 等待开发者工具启动..."
sleep 5

# 检查调试端口是否开启
if lsof -i :9222 >/dev/null 2>&1; then
    echo "✅ 调试端口9222已开启"
    echo "🌐 调试地址: http://localhost:9222"
    echo "📊 可用调试目标: http://localhost:9222/json"
else
    echo "⚠️ 调试端口可能未开启，请手动在设置中启用"
fi

echo "�� 接下来可以运行MCP工具连接调试器" 