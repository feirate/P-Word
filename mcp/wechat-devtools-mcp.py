#!/usr/bin/env python3
"""
微信开发者工具调试日志读取MCP服务器
基于Model Context Protocol (MCP) 实现
"""

import json
import os
import subprocess
import asyncio
import websockets
import psutil
from typing import List, Dict, Any, Optional
from mcp.server.fastmcp import FastMCP
from pathlib import Path

# 创建MCP服务器
mcp = FastMCP("WeChat DevTools Debug Reader")

class WeChatDevToolsConnector:
    """微信开发者工具连接器"""
    
    def __init__(self):
        self.devtools_port = None
        self.websocket_url = None
        self.debug_logs = []
        
    async def find_devtools_process(self) -> Optional[Dict]:
        """查找微信开发者工具进程"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'wechatdevtools' in proc.info['name'].lower() or \
                   '微信开发者工具' in str(proc.info['cmdline']):
                    return proc.info
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return None
    
    async def get_debug_port(self) -> Optional[int]:
        """获取开发者工具的调试端口"""
        # 常见的调试端口
        common_ports = [9222, 9223, 9224, 9225]
        
        for port in common_ports:
            try:
                # 尝试连接Chrome DevTools Protocol
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(f'http://localhost:{port}/json') as resp:
                        if resp.status == 200:
                            return port
            except:
                continue
        return None
    
    async def connect_to_devtools(self) -> bool:
        """连接到开发者工具"""
        port = await self.get_debug_port()
        if port:
            self.devtools_port = port
            self.websocket_url = f"ws://localhost:{port}"
            return True
        return False
    
    async def read_console_logs(self) -> List[Dict]:
        """读取控制台日志"""
        if not self.websocket_url:
            return []
            
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # 获取可用的tab页面
                async with session.get(f'http://localhost:{self.devtools_port}/json') as resp:
                    tabs = await resp.json()
                    
                # 查找小程序相关的tab
                for tab in tabs:
                    if 'miniprogram' in tab.get('url', '').lower() or \
                       'p-word' in tab.get('title', '').lower():
                        
                        # 连接WebSocket获取日志
                        ws_url = tab['webSocketDebuggerUrl']
                        async with websockets.connect(ws_url) as websocket:
                            # 启用Runtime域
                            await websocket.send(json.dumps({
                                "id": 1,
                                "method": "Runtime.enable"
                            }))
                            
                            # 启用Console域
                            await websocket.send(json.dumps({
                                "id": 2,
                                "method": "Console.enable"
                            }))
                            
                            # 获取控制台消息
                            await websocket.send(json.dumps({
                                "id": 3,
                                "method": "Runtime.evaluate",
                                "params": {
                                    "expression": "console.log('MCP连接成功')"
                                }
                            }))
                            
                            # 监听消息
                            logs = []
                            timeout = 5  # 5秒超时
                            try:
                                while timeout > 0:
                                    message = await asyncio.wait_for(websocket.recv(), timeout=1)
                                    data = json.loads(message)
                                    
                                    if data.get('method') == 'Console.messageAdded':
                                        logs.append(data['params']['message'])
                                    elif data.get('method') == 'Runtime.consoleAPICalled':
                                        logs.append(data['params'])
                                    
                                    timeout -= 1
                            except asyncio.TimeoutError:
                                pass
                            
                            return logs
                            
        except Exception as e:
            print(f"连接调试器失败: {e}")
            return []

# 实例化连接器
devtools_connector = WeChatDevToolsConnector()

@mcp.tool()
async def read_wechat_devtools_logs() -> str:
    """读取微信开发者工具的调试日志"""
    try:
        # 查找开发者工具进程
        process_info = await devtools_connector.find_devtools_process()
        if not process_info:
            return "❌ 未找到微信开发者工具进程，请确保工具正在运行"
        
        # 连接到开发者工具
        connected = await devtools_connector.connect_to_devtools()
        if not connected:
            return "❌ 无法连接到微信开发者工具调试接口"
        
        # 读取控制台日志
        logs = await devtools_connector.read_console_logs()
        
        if not logs:
            return "📝 暂未获取到调试日志，可能需要在项目中触发一些操作"
        
        # 格式化日志输出
        log_output = ["🔍 微信开发者工具调试日志:"]
        for log in logs[-10:]:  # 显示最新10条
            if isinstance(log, dict):
                level = log.get('level', 'log')
                text = log.get('text', str(log))
                timestamp = log.get('timestamp', '')
                log_output.append(f"[{level.upper()}] {text}")
        
        return "\n".join(log_output)
        
    except Exception as e:
        return f"❌ 读取调试日志失败: {str(e)}"

@mcp.tool()
async def get_devtools_status() -> str:
    """获取微信开发者工具状态信息"""
    try:
        # 查找进程
        process_info = await devtools_connector.find_devtools_process()
        if not process_info:
            return "❌ 微信开发者工具未运行"
        
        # 获取调试端口
        port = await devtools_connector.get_debug_port()
        
        status_info = [
            "📱 微信开发者工具状态:",
            f"✅ 进程ID: {process_info['pid']}",
            f"📂 进程名: {process_info['name']}",
            f"🔌 调试端口: {port if port else '未找到'}"
        ]
        
        if port:
            status_info.append(f"🌐 调试地址: http://localhost:{port}")
            status_info.append("✅ 可以进行远程调试")
        else:
            status_info.append("⚠️ 调试接口未开启，请在开发者工具中启用")
        
        return "\n".join(status_info)
        
    except Exception as e:
        return f"❌ 获取状态失败: {str(e)}"

@mcp.tool()
async def fix_common_issues() -> str:
    """自动修复常见问题"""
    try:
        issues_fixed = []
        
        # 检查项目路径
        project_path = "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word"
        if os.path.exists(project_path):
            issues_fixed.append("✅ 项目路径存在")
        else:
            issues_fixed.append("❌ 项目路径不存在")
        
        # 检查关键文件
        key_files = [
            "miniprogram/app.js",
            "miniprogram/app.json", 
            "project.config.json"
        ]
        
        for file_path in key_files:
            full_path = os.path.join(project_path, file_path)
            if os.path.exists(full_path):
                issues_fixed.append(f"✅ {file_path} 存在")
            else:
                issues_fixed.append(f"❌ {file_path} 缺失")
        
        # 检查端口占用
        port = await devtools_connector.get_debug_port()
        if port:
            issues_fixed.append(f"✅ 调试端口 {port} 可用")
        else:
            issues_fixed.append("⚠️ 调试端口未开启")
            issues_fixed.append("💡 解决方案: 请在微信开发者工具中启用调试模式")
        
        return "\n".join([
            "🔧 项目诊断结果:",
            *issues_fixed,
            "",
            "💡 建议操作:",
            "1. 确保微信开发者工具正在运行",
            "2. 在工具中打开P-Word项目", 
            "3. 启用真机调试或调试器面板",
            "4. 重新运行MCP工具读取日志"
        ])
        
    except Exception as e:
        return f"❌ 诊断失败: {str(e)}"

@mcp.tool()
async def enable_devtools_debug() -> str:
    """启用开发者工具调试模式的指导"""
    return """
🛠️ 启用微信开发者工具调试模式:

1. **启用Chrome DevTools Protocol:**
   - 打开微信开发者工具
   - 菜单栏 → 设置 → 通用设置
   - 勾选"启用chrome调试器"选项

2. **启用真机调试:**
   - 点击工具栏"真机调试"按钮
   - 扫码连接手机
   - 在调试窗口查看日志

3. **访问调试器:**
   - 浏览器访问: http://localhost:9222
   - 查看可用的调试目标
   - 选择P-Word项目进行调试

4. **使用本MCP工具:**
   ```bash
   # 安装依赖
   pip install mcp aiohttp websockets psutil

   # 运行MCP服务器
   python wechat-devtools-mcp.py
   ```

5. **在Claude中调用:**
   - read_wechat_devtools_logs() - 读取调试日志
   - get_devtools_status() - 获取工具状态
   - fix_common_issues() - 自动诊断问题
"""

if __name__ == "__main__":
    print("🚀 启动微信开发者工具调试MCP服务器...")
    print("📝 可用工具:")
    print("  - read_wechat_devtools_logs: 读取调试日志")
    print("  - get_devtools_status: 获取工具状态") 
    print("  - fix_common_issues: 自动诊断问题")
    print("  - enable_devtools_debug: 获取启用指导")
    
    # 运行MCP服务器
    import uvicorn
    uvicorn.run(mcp.create_app(), host="0.0.0.0", port=8001) 