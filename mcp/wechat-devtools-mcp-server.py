#!/usr/bin/env python3
"""
微信开发者工具调试MCP服务器 - Cursor集成版
优化了错误处理和稳定性，适合在Cursor中长期运行
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from mcp.server.fastmcp import FastMCP
    import psutil
    import aiohttp
    import websockets
except ImportError as e:
    logger.error(f"缺少依赖包: {e}")
    sys.exit(1)

# 创建MCP服务器
mcp = FastMCP("WeChat DevTools Debug Server")

class WeChatDevToolsConnector:
    """微信开发者工具连接器 - 增强版"""
    
    def __init__(self):
        self.project_path = "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word"
        self.debug_port = None
        self.last_logs = []
        
    async def find_devtools_process(self) -> Optional[Dict]:
        """查找微信开发者工具进程"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    name = proc.info['name'].lower()
                    cmdline = ' '.join(proc.info['cmdline'] or []).lower()
                    
                    if ('wechatwebdevtools' in name or 
                        'wechatdevtools' in name or
                        ('devtools' in name and 'wechat' in cmdline)):
                        return proc.info
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.error(f"查找进程失败: {e}")
        return None
    
    async def get_debug_port(self) -> Optional[int]:
        """获取调试端口"""
        if self.debug_port:
            return self.debug_port
            
        ports = [9222, 9223, 9224, 9225]
        for port in ports:
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2)) as session:
                    async with session.get(f'http://localhost:{port}/json/version') as resp:
                        if resp.status == 200:
                            self.debug_port = port
                            return port
            except Exception:
                continue
        return None
    
    async def get_debug_targets(self) -> List[Dict]:
        """获取调试目标"""
        port = await self.get_debug_port()
        if not port:
            return []
            
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f'http://localhost:{port}/json') as resp:
                    if resp.status == 200:
                        targets = await resp.json()
                        # 过滤P-Word相关的目标
                        return [t for t in targets if 'p-word' in t.get('title', '').lower() or 
                               'miniprogram' in t.get('url', '').lower()]
        except Exception as e:
            logger.error(f"获取调试目标失败: {e}")
        return []
    
    async def read_console_logs(self, limit: int = 10) -> List[Dict]:
        """读取控制台日志"""
        targets = await self.get_debug_targets()
        if not targets:
            return []
        
        logs = []
        for target in targets[:1]:  # 只读取第一个目标
            try:
                ws_url = target['webSocketDebuggerUrl']
                async with websockets.connect(ws_url, timeout=5) as websocket:
                    # 启用Runtime和Console
                    await websocket.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
                    await websocket.send(json.dumps({"id": 2, "method": "Console.enable"}))
                    
                    # 监听消息
                    timeout_count = 0
                    while timeout_count < 3:
                        try:
                            message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                            data = json.loads(message)
                            
                            if data.get('method') in ['Console.messageAdded', 'Runtime.consoleAPICalled']:
                                logs.append({
                                    'timestamp': data.get('params', {}).get('timestamp', ''),
                                    'level': data.get('params', {}).get('level', 'log'),
                                    'text': str(data.get('params', {}))
                                })
                        except asyncio.TimeoutError:
                            timeout_count += 1
                            
            except Exception as e:
                logger.error(f"读取日志失败: {e}")
                
        self.last_logs = logs[-limit:] if logs else []
        return self.last_logs

# 实例化连接器
connector = WeChatDevToolsConnector()

@mcp.tool()
async def check_devtools_status() -> str:
    """检查微信开发者工具状态"""
    try:
        # 检查进程
        process = await connector.find_devtools_process()
        if not process:
            return "❌ 微信开发者工具未运行\n💡 请启动微信开发者工具并打开P-Word项目"
        
        # 检查调试端口
        port = await connector.get_debug_port()
        if not port:
            return f"⚠️ 进程运行中(PID: {process['pid']})，但调试端口未开启\n💡 请在设置中启用Chrome调试器"
        
        # 检查调试目标
        targets = await connector.get_debug_targets()
        
        status = [
            "✅ 微信开发者工具状态正常",
            f"📱 进程PID: {process['pid']}",
            f"🔌 调试端口: {port}",
            f"🎯 P-Word调试目标: {len(targets)}个"
        ]
        
        if targets:
            status.append("🌐 可用调试目标:")
            for target in targets:
                status.append(f"   • {target.get('title', 'Unknown')}")
        
        return "\n".join(status)
        
    except Exception as e:
        return f"❌ 状态检查失败: {str(e)}"

@mcp.tool()
async def read_debug_logs(count: int = 10) -> str:
    """读取微信开发者工具的调试日志"""
    try:
        # 首先检查状态
        port = await connector.get_debug_port()
        if not port:
            return "❌ 调试端口未开启，请先启用Chrome调试器"
        
        # 读取日志
        logs = await connector.read_console_logs(count)
        
        if not logs:
            return "📝 暂无调试日志\n💡 请在微信开发者工具中触发一些操作以生成日志"
        
        # 格式化输出
        output = [f"🔍 最新{len(logs)}条调试日志:"]
        for log in logs:
            level = log.get('level', 'log').upper()
            text = log.get('text', '')[:100]  # 限制长度
            output.append(f"[{level}] {text}")
        
        return "\n".join(output)
        
    except Exception as e:
        return f"❌ 读取日志失败: {str(e)}"

@mcp.tool()
async def analyze_project_errors() -> str:
    """分析P-Word项目中的潜在错误"""
    try:
        issues = []
        
        # 检查项目文件完整性
        required_files = [
            "miniprogram/app.js",
            "miniprogram/app.json", 
            "project.config.json"
        ]
        
        for file_path in required_files:
            full_path = os.path.join(connector.project_path, file_path)
            if not os.path.exists(full_path):
                issues.append(f"缺失文件: {file_path}")
        
        # 检查JSON格式
        json_files = ["miniprogram/app.json", "project.config.json"]
        for json_file in json_files:
            full_path = os.path.join(connector.project_path, json_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    issues.append(f"JSON格式错误 {json_file}: {e}")
        
        # 检查代码中的console.error
        error_logs = []
        js_files = []
        miniprogram_dir = os.path.join(connector.project_path, "miniprogram")
        
        for root, dirs, files in os.walk(miniprogram_dir):
            for file in files:
                if file.endswith('.js'):
                    js_files.append(os.path.join(root, file))
        
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                for i, line in enumerate(lines):
                    if 'console.error' in line:
                        error_logs.append({
                            'file': os.path.relpath(js_file, connector.project_path),
                            'line': i + 1,
                            'content': line.strip()
                        })
            except Exception:
                continue
        
        # 生成报告
        result = ["🔍 P-Word项目错误分析:"]
        
        if issues:
            result.append(f"\n❌ 发现{len(issues)}个问题:")
            for issue in issues:
                result.append(f"   • {issue}")
        else:
            result.append("\n✅ 项目文件结构正常")
        
        if error_logs:
            result.append(f"\n📝 代码中的错误日志位置({len(error_logs)}个):")
            for log in error_logs[:5]:  # 显示前5个
                result.append(f"   • {log['file']}:{log['line']} - {log['content'][:50]}...")
        
        return "\n".join(result)
        
    except Exception as e:
        return f"❌ 项目分析失败: {str(e)}"

@mcp.tool()
async def enable_debug_guide() -> str:
    """获取启用调试模式的详细指导"""
    return """
🛠️ 启用微信开发者工具调试模式指南:

📋 方法1: 界面设置 (推荐)
1. 打开微信开发者工具
2. 菜单栏 → 设置 → 通用设置
3. 找到"调试"部分
4. 勾选"开启chrome开发者工具调试"
5. 重启微信开发者工具

📋 方法2: 命令行启动
运行脚本: ./start-devtools-with-debug.sh

📋 方法3: 真机调试
1. 点击工具栏"真机调试"按钮
2. 手机扫描二维码
3. 在调试窗口的Console面板查看日志

🔍 验证调试模式:
- 浏览器访问: http://localhost:9222
- 检查是否显示调试目标列表
- 运行MCP工具: check_devtools_status()

💡 常见问题:
- 端口被占用 → 重启开发者工具
- 权限问题 → 以管理员权限运行
- 版本问题 → 更新到最新版本

🎯 启用后可使用的MCP工具:
- check_devtools_status() - 检查状态
- read_debug_logs() - 读取日志
- analyze_project_errors() - 分析错误
"""

if __name__ == "__main__":
    import uvicorn
    print("🚀 启动微信开发者工具调试MCP服务器...")
    print("🔌 服务地址: http://localhost:8001")
    print("📝 可用工具: check_devtools_status, read_debug_logs, analyze_project_errors")
    
    # 运行服务器
    uvicorn.run(mcp.create_app(), host="127.0.0.1", port=8001) 