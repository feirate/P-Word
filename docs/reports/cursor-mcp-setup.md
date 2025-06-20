# 🚀 Cursor + MCP + 微信开发者工具集成指南

## 📋 第一步：启用微信开发者工具调试接口

### 方法1：界面启用（推荐）
1. **打开微信开发者工具**
2. **菜单栏 → 设置 → 通用设置**
3. **找到"调试"部分，勾选"开启chrome开发者工具调试"**
4. **重启微信开发者工具**
5. **在工具中打开P-Word项目**

### 方法2：命令行启动
```bash
# 运行我们创建的脚本
./start-devtools-with-debug.sh
```

### 验证调试接口是否启用
```bash
# 检查调试端口
lsof -i :9222

# 或访问浏览器
open http://localhost:9222
```

---

## 📋 第二步：安装MCP依赖

```bash
# 安装必要的Python包
pip3 install mcp aiohttp websockets psutil uvicorn

# 或使用虚拟环境
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
pip install mcp aiohttp websockets psutil uvicorn
```

---

## 📋 第三步：配置Cursor Settings

### 1. 打开Cursor Settings
- **Command + ,** (macOS) 或 **Ctrl + ,** (Windows/Linux)
- 或点击左下角齿轮图标

### 2. 添加MCP配置
在Settings中搜索"MCP"或找到"Extensions"部分，添加以下配置：

```json
{
  "mcpServers": {
    "wechat-devtools-debug": {
      "command": "python3",
      "args": [
        "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word/wechat-devtools-mcp-server.py"
      ],
      "env": {
        "PYTHONPATH": "/Users/gongshenshen/KnowledgeBase/20_学习中/P-Word"
      }
    }
  }
}
```

### 3. 保存并重启Cursor

---

## 📋 第四步：测试MCP工具

### 在Cursor中测试
1. **打开任意文件**
2. **按 Command + K 或 Ctrl + K**
3. **输入以下命令测试：**

```
@wechat-devtools-debug check_devtools_status
```

### 可用的MCP工具
- `check_devtools_status()` - 检查微信开发者工具状态
- `read_debug_logs(count=10)` - 读取调试日志
- `analyze_project_errors()` - 分析项目错误
- `enable_debug_guide()` - 获取调试指导

---

## 📋 第五步：高级配置（可选）

### 创建快捷命令
在Cursor的keybindings中添加：

```json
{
  "key": "cmd+shift+d",
  "command": "mcp.runTool",
  "args": {
    "server": "wechat-devtools-debug",
    "tool": "check_devtools_status"
  }
}
```

### 自动启动MCP服务器
创建启动脚本 `start-mcp-server.sh`：

```bash
#!/bin/bash
cd /Users/gongshenshen/KnowledgeBase/20_学习中/P-Word
python3 wechat-devtools-mcp-server.py &
echo "MCP服务器已启动在后台"
```

---

## 🎯 使用场景示例

### 场景1：检查项目状态
```
在Cursor中输入: @wechat-devtools-debug check_devtools_status
```

### 场景2：实时读取调试日志
```
在Cursor中输入: @wechat-devtools-debug read_debug_logs 20
```

### 场景3：分析项目错误
```
在Cursor中输入: @wechat-devtools-debug analyze_project_errors
```

### 场景4：获取调试指导
```
在Cursor中输入: @wechat-devtools-debug enable_debug_guide
```

---

## 🔧 故障排除

### MCP服务器无法启动
```bash
# 检查Python路径
which python3

# 检查依赖安装
pip3 list | grep -E "(mcp|aiohttp|websockets|psutil)"

# 手动启动服务器测试
python3 wechat-devtools-mcp-server.py
```

### 微信开发者工具连接失败
```bash
# 检查进程
ps aux | grep wechat

# 检查调试端口
lsof -i :9222

# 重启开发者工具
pkill -f wechatwebdevtools
./start-devtools-with-debug.sh
```

### Cursor无法识别MCP工具
1. 检查Settings中的配置是否正确
2. 重启Cursor
3. 确保MCP服务器路径正确
4. 检查Python环境和依赖

---

## 📚 完整工作流程

1. **启动微信开发者工具（调试模式）**
   ```bash
   ./start-devtools-with-debug.sh
   ```

2. **在Cursor中检查状态**
   ```
   @wechat-devtools-debug check_devtools_status
   ```

3. **开始调试和开发**
   ```
   @wechat-devtools-debug read_debug_logs
   ```

4. **遇到问题时分析**
   ```
   @wechat-devtools-debug analyze_project_errors
   ```

---

## 🎊 成功配置后的效果

✅ **实时调试日志读取** - 在Cursor中直接查看微信开发者工具的控制台输出
✅ **自动错误检测** - AI助手能够自动识别和修复项目中的问题  
✅ **智能调试建议** - 基于实际日志输出提供精准的修复建议
✅ **无缝开发体验** - 在一个界面中完成编码、调试、修复的完整流程

现在您就拥有了一个强大的AI驱动的微信小程序开发调试环境！🚀 