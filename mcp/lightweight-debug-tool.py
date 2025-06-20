#!/usr/bin/env python3
"""
P-Word微信小程序轻量级调试工具
只使用Python内置库，无需外部依赖
"""

import json
import os
import sys
import subprocess
import socket
from urllib.request import urlopen
from urllib.error import URLError
import time

class SimpleDebugTool:
    """轻量级调试工具"""
    
    def __init__(self, project_path=None):
        self.project_path = project_path or os.getcwd()
        
    def check_port_open(self, port):
        """检查端口是否开启"""
        try:
            # 使用127.0.0.1而不是localhost避免DNS解析问题
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            return result == 0
        except Exception:
            return False
    
    def check_devtools_process(self):
        """检查微信开发者工具进程"""
        try:
            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
            output = result.stdout.lower()
            
            if 'wechatwebdevtools' in output or 'wechatdevtools' in output:
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'wechatwebdevtools' in line.lower() or 'wechatdevtools' in line.lower():
                        return True, line.strip()
            return False, ""
        except Exception as e:
            return False, f"检查进程失败: {e}"
    
    def get_debug_targets(self, port):
        """获取调试目标"""
        try:
            with urlopen(f'http://127.0.0.1:{port}/json', timeout=3) as response:
                data = response.read().decode('utf-8')
                targets = json.loads(data)
                
                # 过滤相关目标
                p_word_targets = []
                for target in targets:
                    title = target.get('title', '')
                    url = target.get('url', '')
                    # 更宽松的匹配条件
                    if (target.get('type') == 'page' or
                        'p-word' in title.lower() or 
                        'miniprogram' in url.lower() or
                        '微信开发者工具' in title or
                        'devtools' in title.lower() or
                        'wx917d03f29b5621a9' in url):  # P-Word的appid
                        p_word_targets.append(target)
                        
                return p_word_targets
        except Exception as e:
            return []
    
    def analyze_project_files(self):
        """分析项目文件"""
        stats = {
            'js_files': 0,
            'wxml_files': 0,
            'wxss_files': 0,
            'json_files': 0,
            'total_lines': 0,
            'missing_files': [],
            'json_errors': []
        }
        
        # 检查必需文件
        required_files = [
            'project.config.json',
            'miniprogram/app.js',
            'miniprogram/app.json',
            'miniprogram/app.wxss'
        ]
        
        for file_path in required_files:
            full_path = os.path.join(self.project_path, file_path)
            if not os.path.exists(full_path):
                stats['missing_files'].append(file_path)
        
        # 统计代码文件
        miniprogram_dir = os.path.join(self.project_path, 'miniprogram')
        if os.path.exists(miniprogram_dir):
            for root, dirs, files in os.walk(miniprogram_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    if file.endswith('.js'):
                        stats['js_files'] += 1
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                stats['total_lines'] += len(f.readlines())
                        except Exception:
                            pass
                    elif file.endswith('.wxml'):
                        stats['wxml_files'] += 1
                    elif file.endswith('.wxss'):
                        stats['wxss_files'] += 1
                    elif file.endswith('.json'):
                        stats['json_files'] += 1
                        # 验证JSON格式
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                json.load(f)
                        except json.JSONDecodeError as e:
                            rel_path = os.path.relpath(file_path, self.project_path)
                            stats['json_errors'].append(f"{rel_path}: {str(e)[:50]}...")
        
        return stats
    
    def generate_status_report(self):
        """生成状态报告"""
        report = ["🔍 P-Word项目状态报告", "=" * 40]
        
        # 1. 检查微信开发者工具
        process_running, process_info = self.check_devtools_process()
        if process_running:
            report.extend([
                "✅ 微信开发者工具: 运行中",
                f"📱 进程信息: {process_info[:80]}..."
            ])
        else:
            report.extend([
                "❌ 微信开发者工具: 未运行",
                "💡 解决方案: 启动微信开发者工具或运行 ./start-devtools-with-debug.sh"
            ])
        
        # 2. 检查调试端口
        debug_ports = [9222, 9223, 9224, 9225]
        active_port = None
        
        for port in debug_ports:
            if self.check_port_open(port):
                active_port = port
                break
        
        if active_port:
            report.append(f"✅ 调试端口: {active_port} (已开启)")
            
            # 获取调试目标
            targets = self.get_debug_targets(active_port)
            report.append(f"🎯 调试目标: {len(targets)}个")
            
            if targets:
                report.append("🌐 可用目标:")
                for i, target in enumerate(targets[:3]):
                    title = target.get('title', 'Unknown')[:40]
                    report.append(f"   {i+1}. {title}")
        else:
            report.extend([
                "⚠️ 调试端口: 未开启",
                "💡 在微信开发者工具中启用Chrome调试器"
            ])
        
        # 3. 项目文件分析
        report.append("\n📊 项目文件分析:")
        stats = self.analyze_project_files()
        
        report.extend([
            f"   • JavaScript文件: {stats['js_files']}个",
            f"   • 代码总行数: {stats['total_lines']}行",
            f"   • WXML页面: {stats['wxml_files']}个",
            f"   • WXSS样式: {stats['wxss_files']}个",
            f"   • JSON配置: {stats['json_files']}个"
        ])
        
        # 4. 问题检查
        issues = []
        if stats['missing_files']:
            issues.append("缺失关键文件:")
            issues.extend([f"   • {f}" for f in stats['missing_files']])
        
        if stats['json_errors']:
            issues.append("JSON格式错误:")
            issues.extend([f"   • {e}" for e in stats['json_errors']])
        
        if issues:
            report.extend(["\n⚠️ 发现的问题:"] + issues)
        else:
            report.append("\n✅ 未发现明显问题")
        
        return "\n".join(report)
    
    def get_debug_suggestions(self):
        """获取调试建议"""
        return """
🛠️ P-Word调试建议

📋 启用调试模式:
1. 微信开发者工具 → 设置 → 通用设置
2. 勾选"开启chrome开发者工具调试" 
3. 重启微信开发者工具
4. 验证: 访问 http://localhost:9222

📋 调试技巧:
• Console: 查看日志和错误
• Sources: 设置断点调试
• Network: 监控API请求
• Application: 检查本地存储

📋 常见问题:
• 录音问题: 检查权限和getRecorderManager
• 网络错误: 验证云函数配置
• 页面异常: 查看Console错误堆栈
• 性能问题: 优化setData使用

📋 快速命令:
• python3 lightweight-debug-tool.py - 运行调试工具
• ./start-devtools-with-debug.sh - 启动调试模式
• curl http://localhost:9222/json - 查看调试目标
"""

def main():
    """主函数"""
    print("🚀 P-Word轻量级调试工具")
    
    tool = SimpleDebugTool()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'status':
            print(tool.generate_status_report())
        elif command == 'suggestions':
            print(tool.get_debug_suggestions())
        elif command == 'json':
            # 输出JSON格式，供其他工具使用
            stats = tool.analyze_project_files()
            process_running, _ = tool.check_devtools_process()
            
            result = {
                'process_running': process_running,
                'debug_port': 9222 if tool.check_port_open(9222) else None,
                'project_stats': stats,
                'timestamp': time.time()
            }
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print("可用命令: status, suggestions, json")
    else:
        # 交互模式
        while True:
            print("\n" + "="*50)
            print("📋 可用功能:")
            print("1. 状态报告")
            print("2. 调试建议") 
            print("3. 退出")
            
            try:
                choice = input("\n请选择 (1-3): ").strip()
                
                if choice == '1':
                    print("\n" + tool.generate_status_report())
                elif choice == '2':
                    print(tool.get_debug_suggestions())
                elif choice == '3':
                    print("👋 再见!")
                    break
                else:
                    print("❌ 无效选择")
            except KeyboardInterrupt:
                print("\n👋 再见!")
                break

# API接口函数，供Cursor MCP使用
def check_debug_status():
    """API: 检查调试状态"""
    tool = SimpleDebugTool()
    return tool.generate_status_report()

def get_project_analysis():
    """API: 获取项目分析"""
    tool = SimpleDebugTool()
    stats = tool.analyze_project_files()
    
    lines = ["📊 P-Word项目分析"]
    lines.extend([
        f"• JavaScript: {stats['js_files']}文件, {stats['total_lines']}行代码",
        f"• 页面资源: {stats['wxml_files']}个WXML, {stats['wxss_files']}个WXSS",
        f"• 配置文件: {stats['json_files']}个JSON"
    ])
    
    if stats['missing_files'] or stats['json_errors']:
        lines.append("\n⚠️ 问题:")
        lines.extend([f"• {f}" for f in stats['missing_files']])
        lines.extend([f"• {e}" for e in stats['json_errors']])
    else:
        lines.append("\n✅ 项目结构完整")
    
    return "\n".join(lines)

if __name__ == "__main__":
    main() 