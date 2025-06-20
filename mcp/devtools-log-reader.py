#!/usr/bin/env python3
"""
微信开发者工具调试日志读取器 - 简化版
直接读取开发者工具的日志文件和进程信息
"""

import os
import sys
import json
import psutil
import subprocess
from datetime import datetime
from pathlib import Path

class WeChatDevToolsLogReader:
    """微信开发者工具日志读取器"""
    
    def __init__(self):
        self.devtools_process = None
        self.log_files = []
        
    def find_devtools_process(self):
        """查找微信开发者工具进程"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
            try:
                process_name = proc.info['name'].lower()
                cmdline = ' '.join(proc.info['cmdline'] or []).lower()
                
                if any(keyword in process_name for keyword in ['wechatdevtools', 'wechat', 'devtools']) or \
                   any(keyword in cmdline for keyword in ['微信开发者工具', 'wechatdevtools', 'wechat']):
                    return proc.info
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return None
    
    def find_log_files(self):
        """查找日志文件"""
        possible_paths = [
            # macOS
            os.path.expanduser("~/Library/Application Support/微信开发者工具/Default/logs"),
            os.path.expanduser("~/Library/Application Support/wechatdevtools/Default/logs"),
            os.path.expanduser("~/Library/Logs/微信开发者工具"),
            # 项目特定日志
            "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word/.logs",
            "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word/logs",
        ]
        
        log_files = []
        for path in possible_paths:
            if os.path.exists(path):
                for root, dirs, files in os.walk(path):
                    for file in files:
                        if file.endswith(('.log', '.txt')) and any(keyword in file.lower() for keyword in ['console', 'debug', 'error', 'main']):
                            log_files.append(os.path.join(root, file))
        
        return log_files
    
    def check_debug_ports(self):
        """检查调试端口"""
        import socket
        ports_status = {}
        common_ports = [9222, 9223, 9224, 9225, 8080, 3000]
        
        for port in common_ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', port))
            ports_status[port] = result == 0
            sock.close()
            
        return ports_status
    
    def get_console_logs_via_cli(self):
        """通过命令行接口获取日志"""
        try:
            # 尝试使用微信开发者工具的CLI
            cli_paths = [
                "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
                "/Applications/微信开发者工具.app/Contents/MacOS/cli"
            ]
            
            for cli_path in cli_paths:
                if os.path.exists(cli_path):
                    # 尝试获取项目信息
                    result = subprocess.run([
                        cli_path, 
                        "--project", "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word",
                        "--info"
                    ], capture_output=True, text=True, timeout=10)
                    
                    if result.returncode == 0:
                        return result.stdout
                    
        except Exception as e:
            return f"CLI调用失败: {e}"
        
        return "未找到CLI工具"
    
    def read_latest_logs(self, limit=20):
        """读取最新的日志"""
        log_files = self.find_log_files()
        if not log_files:
            return []
        
        # 按修改时间排序
        log_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        all_logs = []
        for log_file in log_files[:3]:  # 只读取最新的3个文件
            try:
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    
                # 获取最新的几行
                recent_lines = lines[-limit:] if len(lines) > limit else lines
                
                for line in recent_lines:
                    if line.strip() and any(keyword in line.lower() for keyword in ['error', 'warn', 'console', 'debug', 'p-word']):
                        all_logs.append({
                            'file': os.path.basename(log_file),
                            'content': line.strip(),
                            'timestamp': datetime.now().isoformat()
                        })
                        
            except Exception as e:
                all_logs.append({
                    'file': os.path.basename(log_file),
                    'content': f"读取失败: {e}",
                    'timestamp': datetime.now().isoformat()
                })
        
        return all_logs[-limit:] if len(all_logs) > limit else all_logs

def main():
    """主函数"""
    reader = WeChatDevToolsLogReader()
    
    print("🔍 微信开发者工具调试信息读取器")
    print("=" * 50)
    
    # 1. 检查进程状态
    print("\n📱 进程状态检查:")
    process = reader.find_devtools_process()
    if process:
        print(f"✅ 找到微信开发者工具进程")
        print(f"   PID: {process['pid']}")
        print(f"   名称: {process['name']}")
        print(f"   工作目录: {process.get('cwd', 'N/A')}")
    else:
        print("❌ 未找到微信开发者工具进程")
    
    # 2. 检查调试端口
    print("\n🔌 调试端口检查:")
    ports = reader.check_debug_ports()
    active_ports = [port for port, active in ports.items() if active]
    if active_ports:
        print(f"✅ 发现活跃端口: {active_ports}")
        for port in active_ports:
            print(f"   http://localhost:{port} - 可能的调试接口")
    else:
        print("⚠️ 未发现活跃的调试端口")
    
    # 3. 查找日志文件
    print("\n📝 日志文件检查:")
    log_files = reader.find_log_files()
    if log_files:
        print(f"✅ 找到 {len(log_files)} 个日志文件:")
        for log_file in log_files[:5]:  # 只显示前5个
            mod_time = datetime.fromtimestamp(os.path.getmtime(log_file))
            print(f"   {log_file} (修改时间: {mod_time})")
    else:
        print("⚠️ 未找到日志文件")
    
    # 4. 读取最新日志
    print("\n📊 最新调试日志:")
    logs = reader.read_latest_logs(10)
    if logs:
        for log in logs:
            print(f"[{log['file']}] {log['content']}")
    else:
        print("📝 暂无相关日志")
    
    # 5. CLI工具检查
    print("\n🛠️ CLI工具检查:")
    cli_result = reader.get_console_logs_via_cli()
    print(cli_result)
    
    # 6. 提供解决方案
    print("\n💡 调试建议:")
    if not process:
        print("1. 启动微信开发者工具")
        print("2. 打开P-Word项目")
    
    if not active_ports:
        print("3. 在开发者工具中启用调试模式:")
        print("   - 设置 → 通用设置 → 勾选'启用chrome调试器'")
        print("   - 或点击'真机调试'按钮")
    
    if active_ports:
        print("4. 可以通过以下方式访问调试器:")
        for port in active_ports:
            print(f"   - 浏览器访问: http://localhost:{port}")
    
    print("\n🌐 远程调试URL (如果可用):")
    for port in active_ports:
        print(f"   http://localhost:{port}/json - 获取调试目标列表")

if __name__ == "__main__":
    main() 