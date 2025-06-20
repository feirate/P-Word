#!/usr/bin/env python3
"""
P-Word项目调试助手
检查项目状态并提供修复建议
"""

import os
import sys
import json
import subprocess
import psutil
from datetime import datetime
from pathlib import Path

class PWordDebugAssistant:
    """P-Word项目调试助手"""
    
    def __init__(self):
        self.project_path = "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word"
        self.issues = []
        self.fixes = []
        
    def check_project_structure(self):
        """检查项目结构"""
        print("📁 项目结构检查:")
        
        required_files = [
            "miniprogram/app.js",
            "miniprogram/app.json",
            "miniprogram/app.wxss",
            "project.config.json",
            "miniprogram/pages/index/index.js",
            "miniprogram/pages/demo/demo.js"
        ]
        
        for file_path in required_files:
            full_path = os.path.join(self.project_path, file_path)
            if os.path.exists(full_path):
                print(f"   ✅ {file_path}")
            else:
                print(f"   ❌ {file_path} - 缺失")
                self.issues.append(f"缺失文件: {file_path}")
    
    def check_devtools_process(self):
        """检查微信开发者工具进程"""
        print("\n🔍 微信开发者工具进程检查:")
        
        devtools_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                name = proc.info['name'].lower()
                cmdline = ' '.join(proc.info['cmdline'] or []).lower()
                
                # 更精确的匹配微信开发者工具
                if ('wechatwebdevtools' in name or 
                    'wechatdevtools' in name or
                    'wx_dev_tools' in name or
                    'devtools' in name and 'wechat' in cmdline or
                    '微信开发者工具' in cmdline):
                    devtools_processes.append(proc.info)
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if devtools_processes:
            print(f"   ✅ 找到 {len(devtools_processes)} 个相关进程:")
            for proc in devtools_processes:
                print(f"      PID: {proc['pid']}, 名称: {proc['name']}")
        else:
            print("   ❌ 未找到微信开发者工具进程")
            self.issues.append("微信开发者工具未运行")
            self.fixes.append("启动微信开发者工具")
    
    def check_debug_ports(self):
        """检查调试端口"""
        print("\n🔌 调试端口检查:")
        
        import socket
        debug_ports = [9222, 9223, 9224, 9225]
        active_ports = []
        
        for port in debug_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('127.0.0.1', port))
                if result == 0:
                    active_ports.append(port)
                    print(f"   ✅ 端口 {port} 活跃")
                sock.close()
            except Exception:
                pass
        
        if not active_ports:
            print("   ⚠️ 未发现调试端口")
            self.issues.append("调试端口未开启")
            self.fixes.append("在微信开发者工具中启用调试模式")
        
        return active_ports
    
    def check_console_logs(self):
        """检查控制台日志输出"""
        print("\n📝 项目代码中的日志检查:")
        
        js_files = []
        for root, dirs, files in os.walk(os.path.join(self.project_path, "miniprogram")):
            for file in files:
                if file.endswith('.js'):
                    js_files.append(os.path.join(root, file))
        
        console_logs = []
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                for i, line in enumerate(lines):
                    if 'console.' in line and any(keyword in line.lower() for keyword in ['error', 'warn', 'log']):
                        console_logs.append({
                            'file': os.path.relpath(js_file, self.project_path),
                            'line': i + 1,
                            'content': line.strip()
                        })
                        
            except Exception as e:
                continue
        
        if console_logs:
            print(f"   ✅ 找到 {len(console_logs)} 个日志输出点:")
            for log in console_logs[:5]:  # 显示前5个
                print(f"      {log['file']}:{log['line']} - {log['content'][:60]}...")
        else:
            print("   📝 未找到console日志")
    
    def get_compilation_errors(self):
        """获取编译错误"""
        print("\n🛠️ 编译检查:")
        
        # 检查JSON文件格式
        json_files = [
            "miniprogram/app.json",
            "project.config.json",
            "miniprogram/pages/index/index.json",
            "miniprogram/pages/demo/demo.json"
        ]
        
        for json_file in json_files:
            full_path = os.path.join(self.project_path, json_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        json.load(f)
                    print(f"   ✅ {json_file} - JSON格式正确")
                except json.JSONDecodeError as e:
                    print(f"   ❌ {json_file} - JSON格式错误: {e}")
                    self.issues.append(f"JSON格式错误: {json_file}")
                    self.fixes.append(f"修复{json_file}的JSON格式")
            else:
                print(f"   ⚠️ {json_file} - 文件不存在")
    
    def provide_debug_solutions(self):
        """提供调试解决方案"""
        print("\n💡 调试解决方案:")
        
        # 基本的调试建议
        solutions = [
            "1. 确保微信开发者工具正在运行",
            "2. 在开发者工具中导入P-Word项目",
            "3. 检查编译是否成功（无红色错误信息）",
            "4. 打开调试器面板查看Console输出",
            "5. 尝试点击页面功能触发日志输出"
        ]
        
        # 启用调试模式的建议
        debug_steps = [
            "\n🔧 启用调试模式:",
            "1. 微信开发者工具 → 设置 → 通用设置",
            "2. 勾选'启用chrome调试器'", 
            "3. 重启开发者工具",
            "4. 浏览器访问: http://localhost:9222",
            "5. 选择P-Word项目的调试目标"
        ]
        
        # 真机调试建议
        remote_debug = [
            "\n📱 真机调试:",
            "1. 点击工具栏'真机调试'按钮",
            "2. 手机扫描二维码",
            "3. 在调试窗口查看Console面板",
            "4. 将上下文切换到'VM Context 1'"
        ]
        
        for solution in solutions + debug_steps + remote_debug:
            print(solution)
    
    def generate_debug_commands(self):
        """生成调试命令"""
        print("\n🎯 可执行的调试命令:")
        
        commands = [
            "# 检查微信开发者工具进程",
            "ps aux | grep -i wechat",
            "",
            "# 检查调试端口",
            "lsof -i :9222",
            "lsof -i :9223", 
            "",
            "# 检查项目文件",
            f"ls -la {self.project_path}/miniprogram/",
            "",
            "# 验证JSON格式",
            f"python3 -m json.tool {self.project_path}/miniprogram/app.json",
            f"python3 -m json.tool {self.project_path}/project.config.json",
            "",
            "# 查看最新的系统日志",
            "tail -f ~/Library/Logs/微信开发者工具/main.log 2>/dev/null || echo '日志文件不存在'"
        ]
        
        for cmd in commands:
            print(f"   {cmd}")
    
    def create_debug_report(self):
        """创建调试报告"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "project_path": self.project_path,
            "issues": self.issues,
            "fixes": self.fixes,
            "status": "项目已就绪" if not self.issues else f"发现{len(self.issues)}个问题"
        }
        
        report_file = "debug-report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 调试报告已保存: {report_file}")
        
        return report

def main():
    """主函数"""
    print("🎯 P-Word项目调试助手")
    print("=" * 50)
    
    assistant = PWordDebugAssistant()
    
    # 执行各种检查
    assistant.check_project_structure()
    assistant.check_devtools_process()
    active_ports = assistant.check_debug_ports()
    assistant.check_console_logs()
    assistant.get_compilation_errors()
    
    # 提供解决方案
    assistant.provide_debug_solutions()
    assistant.generate_debug_commands()
    
    # 生成报告
    report = assistant.create_debug_report()
    
    # 总结
    print(f"\n📋 总结:")
    if assistant.issues:
        print(f"❌ 发现 {len(assistant.issues)} 个问题:")
        for issue in assistant.issues:
            print(f"   • {issue}")
        print(f"\n🔧 建议修复:")
        for fix in assistant.fixes:
            print(f"   • {fix}")
    else:
        print("✅ 项目状态良好，可以开始调试")
    
    if active_ports:
        print(f"\n🌐 可用的调试接口:")
        for port in active_ports:
            print(f"   http://localhost:{port}")

if __name__ == "__main__":
    main() 