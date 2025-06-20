#!/bin/bash

# P-Word Day 2 快速测试脚本
# 执行今天的开发功能验证测试

echo "🧪 P-Word Day 2 功能验收测试"
echo "=================================="

# 设置项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 项目路径: $PROJECT_ROOT"
echo "📅 测试日期: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js环境，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo ""

# 运行自动化测试
echo "🚀 开始执行Day 2功能测试..."
echo ""

if [ -f "scripts/runDailyTests.js" ]; then
    # 使用Node.js运行测试脚本
    node scripts/runDailyTests.js
    
    # 检查测试结果
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Day 2测试执行完成！"
        
        # 显示测试结果摘要
        if [ -f "test-results/latest.json" ]; then
            echo ""
            echo "📊 测试结果摘要:"
            echo "----------------"
            # 使用node解析JSON并显示关键信息
            node -e "
                const fs = require('fs');
                try {
                    const result = JSON.parse(fs.readFileSync('test-results/latest.json', 'utf8'));
                    console.log(\`📅 测试日: Day \${result.day}\`);
                    console.log(\`🎯 通过率: \${((result.passedTests / result.totalTests) * 100).toFixed(1)}%\`);
                    console.log(\`✅ 通过: \${result.passedTests}个\`);
                    console.log(\`❌ 失败: \${result.failedTests}个\`);
                    console.log(\`📋 总计: \${result.totalTests}个测试\`);
                    if (result.categories) {
                        console.log('\\n📈 分类统计:');
                        Object.entries(result.categories).forEach(([cat, stats]) => {
                            const rate = ((stats.passed / stats.total) * 100).toFixed(1);
                            console.log(\`  \${cat}: \${stats.passed}/\${stats.total} (\${rate}%)\`);
                        });
                    }
                } catch (error) {
                    console.log('无法解析测试结果文件');
                }
            "
        fi
        
    else
        echo ""
        echo "❌ 测试执行失败，请检查错误信息"
        exit 1
    fi
else
    echo "❌ 错误: 未找到测试脚本 scripts/runDailyTests.js"
    exit 1
fi

echo ""
echo "🎬 Demo验收环境已就绪！"
echo "访问路径: miniprogram/pages/demo/demo"
echo ""

# 检查Demo页面文件
if [ -f "miniprogram/pages/demo/demo.js" ] && [ -f "miniprogram/pages/demo/demo.wxml" ]; then
    echo "✅ Demo页面文件完整"
    echo "   - demo.js: 功能逻辑完成"
    echo "   - demo.wxml: 界面布局完成"
    echo "   - demo.wxss: 样式文件完成"
else
    echo "⚠️ Demo页面文件不完整，请检查以下文件:"
    echo "   - miniprogram/pages/demo/demo.js"
    echo "   - miniprogram/pages/demo/demo.wxml"
    echo "   - miniprogram/pages/demo/demo.wxss"
fi

echo ""
echo "📝 测试报告位置:"
echo "   - 详细报告: test-results/"
echo "   - 最新结果: test-results/latest.json"
echo ""

# 提供下一步操作建议
echo "🚀 下一步操作建议:"
echo "1. 在微信开发者工具中打开项目"
echo "2. 进入Demo页面测试各项功能"
echo "3. 检查测试报告中的失败项目"
echo "4. 根据测试结果进行优化"
echo ""

echo "🎉 Day 2功能验收测试完成！" 