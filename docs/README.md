# P-Word 项目文档目录

## 目录结构说明

本项目采用 Google 开发规范组织文档和代码，保持项目整洁有序。

### 📁 目录结构

```
P-Word/
├── 📁 docs/                    # 📖 所有文档
│   ├── 📁 design/              # 🎨 设计文档
│   │   ├── P-Word 产品设计书.md
│   │   ├── P-Word 技术设计文档.md
│   │   ├── P-Word 安全设计文档.md
│   │   └── P-Word 语音评分模块技术补充设计.md
│   ├── 📁 development/         # 🔧 开发文档
│   │   ├── 开发方案.md
│   │   └── 启动Demo指南.md
│   ├── 📁 test/               # 🧪 测试文档
│   │   └── P-Word测试计划.md
│   ├── 📁 config/             # ⚙️ 配置文档
│   │   ├── cursor-settings.json
│   │   ├── project.config.json
│   │   └── project.private.config.json
│   ├── 📁 reports/            # 📊 各种报告
│   │   ├── debug-fix-report.md
│   │   ├── cursor-mcp-setup.md
│   │   ├── project-verification.md
│   │   ├── 下一句功能修复报告.md
│   │   ├── 权限申请修复报告.md
│   │   ├── 语料库修复报告.md
│   │   ├── 运行时错误修复报告.md
│   │   └── 调试接口启用完成报告.md
│   └── 📁 diary/              # 📝 开发日记
│       └── P-Word 的 AI 全栈开发日记-20250619.md
├── 📁 mcp/                     # 🤖 MCP 相关脚本和配置
│   ├── cursor-mcp-final-config.json
│   ├── mcp-config.json
│   ├── lightweight-debug-tool.py
│   ├── simple-debug-assistant.py
│   ├── wechat-devtools-mcp-server.py
│   ├── wechat-devtools-mcp.py
│   ├── debug-assistant.py
│   ├── devtools-log-reader.py
│   ├── start-devtools-with-debug.sh
│   └── debug-report.json
├── 📁 scripts/                # 📜 项目脚本
│   ├── runDailyTests.js
│   ├── runTodayTest.sh
│   ├── daily_push.sh
│   └── auto_commit.sh
├── 📁 build/                  # 🏗️ 构建产物
│   └── test-results/
├── 📁 tools/                  # 🛠️ 开发工具
├── 📁 miniprogram/            # 📱 小程序源码
├── 📁 cloudfunctions/         # ☁️ 云函数
├── project.config.json        # ⚙️ 微信小程序配置（根目录必需）
├── .gitignore
└── README.md
```

## 📋 文档分类规范

### 🎨 design/ - 设计文档
- **产品设计文档**：产品需求、功能规划、用户体验设计
- **技术设计文档**：架构设计、技术选型、API设计
- **安全设计文档**：安全策略、隐私保护、数据加密
- **模块设计文档**：特定功能模块的详细设计

### 🔧 development/ - 开发文档
- **开发方案**：技术实现方案、开发流程
- **部署指南**：环境配置、部署步骤
- **API文档**：接口说明、参数定义
- **编码规范**：代码风格、命名规范

### 🧪 test/ - 测试文档
- **测试计划**：测试策略、测试用例
- **测试报告**：测试结果、bug报告
- **性能测试**：性能基准、压力测试结果

### ⚙️ config/ - 配置文档
- **项目配置**：各种工具和框架的配置文件
- **环境配置**：开发、测试、生产环境配置
- **IDE配置**：编辑器和开发工具配置

### 📊 reports/ - 报告文档
- **修复报告**：bug修复、功能改进报告
- **项目报告**：项目进度、验收报告
- **技术报告**：技术调研、性能分析报告

### 📝 diary/ - 开发日记
- **开发日志**：每日开发记录、问题解决过程
- **学习笔记**：技术学习心得、经验总结
- **项目里程碑**：重要节点记录

## 🔄 文件组织原则

1. **按功能分类**：同类型文档放在同一目录
2. **保持简洁**：避免过深的目录嵌套
3. **命名规范**：使用清晰的文件名和目录名
4. **及时整理**：定期清理和归档文档
5. **版本控制**：重要文档保留历史版本

## 📝 新增文档规范

当添加新文档时，请按照以下规则放置：

- **设计相关** → `docs/design/`
- **开发相关** → `docs/development/`
- **测试相关** → `docs/test/`
- **配置相关** → `docs/config/`
- **报告相关** → `docs/reports/`
- **日记相关** → `docs/diary/`

## 🚀 快速导航

- [产品设计](design/P-Word%20英语口语练习小程序产品设计书.md)
- [技术设计](design/P-Word%20英语口语练习小程序技术设计文档.md)
- [开发方案](development/开发方案.md)
- [启动指南](development/启动Demo指南.md)
- [测试计划](test/P-Word测试计划.md)
- [项目验证](reports/project-verification.md) 