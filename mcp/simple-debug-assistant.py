#!/usr/bin/env python3
"""
P-Word微信小程序调试助手 - 简化版
不依赖MCP框架，可以直接运行或被其他程序调用
"""

import json
import os
import sys
import time
import subprocess
import asyncio
from typing import Dict, List, Optional, Any

try:
    import requests
    import psutil
except ImportError:
    print("正在安装必要依赖...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "psutil"])
    import requests
    import psutil

class WeChatDevToolsDebugger:
    """微信开发者工具调试器"""
    
    def __init__(self, project_path: str = None):
        self.project_path = project_path or os.getcwd()
        self.debug_port = None
        
    def find_devtools_process(self) -> Optional[Dict]:
        """查找微信开发者工具进程"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'status']):
                try:
                    name = proc.info['name'].lower()
                    cmdline = ' '.join(proc.info['cmdline'] or []).lower()
                    
                    if ('wechatwebdevtools' in name or 
                        'wechatdevtools' in name or
                        ('devtools' in name and 'wechat' in cmdline)):
                        return {
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'status': proc.info['status'],
                            'cmdline': proc.info['cmdline']
                        }
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"查找进程失败: {e}")
        return None
    
    def get_debug_port(self) -> Optional[int]:
        """获取调试端口"""
        if self.debug_port:
            return self.debug_port
            
        ports = [9222, 9223, 9224, 9225]
        for port in ports:
            try:
                response = requests.get(f'http://localhost:{port}/json/version', timeout=2)
                if response.status_code == 200:
                    self.debug_port = port
                    return port
            except Exception:
                continue
        return None
    
    def get_debug_targets(self) -> List[Dict]:
        """获取调试目标"""
        port = self.get_debug_port()
        if not port:
            return []
            
        try:
            response = requests.get(f'http://localhost:{port}/json', timeout=5)
            if response.status_code == 200:
                targets = response.json()
                # 过滤P-Word相关的目标
                return [t for t in targets if 'p-word' in t.get('title', '').lower() or 
                       'miniprogram' in t.get('url', '').lower() or
                       '微信开发者工具' in t.get('title', '')]
        except Exception as e:
            print(f"获取调试目标失败: {e}")
        return []
    
    def check_status(self) -> str:
        """检查开发者工具状态"""
        status_lines = ["🔍 微信开发者工具状态检查"]
        
        # 检查进程
        process = self.find_devtools_process()
        if not process:
            status_lines.extend([
                "❌ 微信开发者工具未运行",
                "💡 解决方案:",
                "   1. 启动微信开发者工具",
                "   2. 运行: ./start-devtools-with-debug.sh",
                "   3. 或手动启动并在设置中启用Chrome调试器"
            ])
            return "\n".join(status_lines)
        
        status_lines.extend([
            f"✅ 进程运行中 (PID: {process['pid']})",
            f"📱 进程名称: {process['name']}",
            f"🔄 进程状态: {process['status']}"
        ])
        
        # 检查调试端口
        port = self.get_debug_port()
        if not port:
            status_lines.extend([
                "⚠️ 调试端口未开启",
                "💡 解决方案:",
                "   1. 微信开发者工具 → 设置 → 通用设置",
                "   2. 勾选'开启chrome开发者工具调试'",
                "   3. 重启微信开发者工具"
            ])
            return "\n".join(status_lines)
        
        status_lines.append(f"✅ 调试端口已开启: {port}")
        
        # 检查调试目标
        targets = self.get_debug_targets()
        status_lines.append(f"🎯 调试目标数量: {len(targets)}")
        
        if targets:
            status_lines.append("🌐 可用调试目标:")
            for i, target in enumerate(targets[:3]):  # 显示前3个
                title = target.get('title', 'Unknown')[:50]
                status_lines.append(f"   {i+1}. {title}")
        
        return "\n".join(status_lines)
    
    def analyze_project(self) -> str:
        """分析项目状态"""
        analysis_lines = ["🔍 P-Word项目分析"]
        issues = []
        
        # 检查关键文件
        key_files = {
            "project.config.json": "项目配置文件",
            "miniprogram/app.js": "小程序入口文件", 
            "miniprogram/app.json": "小程序配置文件",
            "miniprogram/app.wxss": "全局样式文件"
        }
        
        missing_files = []
        for file_path, description in key_files.items():
            full_path = os.path.join(self.project_path, file_path)
            if not os.path.exists(full_path):
                missing_files.append(f"{file_path} ({description})")
        
        if missing_files:
            issues.extend([
                "❌ 缺失关键文件:",
                *[f"   • {f}" for f in missing_files]
            ])
        else:
            analysis_lines.append("✅ 关键文件完整")
        
        # 检查JSON格式
        json_files = ["project.config.json", "miniprogram/app.json"]
        json_errors = []
        
        for json_file in json_files:
            full_path = os.path.join(self.project_path, json_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    json_errors.append(f"{json_file}: {str(e)[:50]}...")
        
        if json_errors:
            issues.extend([
                "❌ JSON格式错误:",
                *[f"   • {e}" for e in json_errors]
            ])
        else:
            analysis_lines.append("✅ JSON格式正确")
        
        # 统计代码量
        code_stats = self.get_code_statistics()
        analysis_lines.extend([
            f"📊 代码统计:",
            f"   • JavaScript文件: {code_stats['js_files']}个",
            f"   • 总代码行数: {code_stats['total_lines']}行",
            f"   • WXML页面: {code_stats['wxml_files']}个",
            f"   • WXSS样式: {code_stats['wxss_files']}个"
        ])
        
        # 如果有问题，添加到分析结果
        if issues:
            analysis_lines.extend(["", "⚠️ 发现的问题:"] + issues)
            
        return "\n".join(analysis_lines)
    
    def get_code_statistics(self) -> Dict[str, int]:
        """获取代码统计信息"""
        stats = {
            'js_files': 0,
            'wxml_files': 0, 
            'wxss_files': 0,
            'total_lines': 0
        }
        
        try:
            miniprogram_dir = os.path.join(self.project_path, "miniprogram")
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
                            
        except Exception as e:
            print(f"统计代码时出错: {e}")
            
        return stats
    
    def get_debug_guide(self) -> str:
        """获取调试指导"""
        return """
🛠️ P-Word调试指南

📋 1. 启用调试模式
• 方法1: 微信开发者工具 → 设置 → 通用设置 → 勾选"开启chrome开发者工具调试"
• 方法2: 运行 ./start-devtools-with-debug.sh
• 验证: 访问 http://localhost:9222

📋 2. 常用调试技巧
• Console面板: 查看日志输出和错误信息
• Network面板: 监控网络请求和API调用
• Sources面板: 设置断点调试JavaScript代码
• Application面板: 查看本地存储和缓存

📋 3. P-Word特有调试点
• 录音功能: 检查getRecorderManager相关日志
• 语料推荐: 查看sentenceService.js中的推荐算法输出
• 云同步: 监控cloudService.js的同步状态
• 历史记录: 查看storage中的用户练习数据

📋 4. 常见问题排查
• 编译失败: 检查语法错误和依赖配置
• 录音无声: 确认录音权限和设备状态
• 网络错误: 检查云函数配置和网络连接
• 页面异常: 查看Console中的错误堆栈

📋 5. 性能优化建议
• 使用wx.createSelectorQuery()优化DOM操作
• 合理使用setData，避免频繁更新
• 压缩图片资源，使用webp格式
• 启用小程序分包加载

💡 提示: 结合使用这个调试助手和微信开发者工具的内置调试器，可以获得最佳的调试体验！
"""

def main():
    """主函数 - 可以直接运行或被其他程序调用"""
    print("🚀 P-Word调试助手启动")
    
    # 获取项目路径
    project_path = os.path.dirname(os.path.abspath(__file__))
    debugger = WeChatDevToolsDebugger(project_path)
    
    while True:
        print("\n" + "="*50)
        print("📋 可用功能:")
        print("1. 检查开发者工具状态")
        print("2. 分析项目结构")
        print("3. 获取调试指导")
        print("4. 一键诊断")
        print("5. 退出")
        
        try:
            choice = input("\n请选择功能 (1-5): ").strip()
            
            if choice == '1':
                print("\n" + debugger.check_status())
                
            elif choice == '2':
                print("\n" + debugger.analyze_project())
                
            elif choice == '3':
                print(debugger.get_debug_guide())
                
            elif choice == '4':
                print("\n🔍 正在进行一键诊断...")
                print("\n" + debugger.check_status())
                print("\n" + debugger.analyze_project())
                
            elif choice == '5':
                print("👋 再见！")
                break
                
            else:
                print("❌ 无效选择，请输入1-5")
                
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 发生错误: {e}")

# API接口 - 供其他程序调用
def check_devtools_status(project_path: str = None) -> Dict[str, Any]:
    """检查开发者工具状态 - API接口"""
    debugger = WeChatDevToolsDebugger(project_path)
    
    process = debugger.find_devtools_process()
    port = debugger.get_debug_port()
    targets = debugger.get_debug_targets()
    
    return {
        'process_running': process is not None,
        'debug_port': port,
        'targets_count': len(targets),
        'status_text': debugger.check_status()
    }

def analyze_project_structure(project_path: str = None) -> Dict[str, Any]:
    """分析项目结构 - API接口"""
    debugger = WeChatDevToolsDebugger(project_path)
    stats = debugger.get_code_statistics()
    
    return {
        'code_statistics': stats,
        'analysis_text': debugger.analyze_project()
    }

if __name__ == "__main__":
    main() 