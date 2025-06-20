# P-Word 安全设计文档

> 专注英语口语练习小程序的安全防护方案
> 
> **版本**: v1.0  
> **更新时间**: 2025-06-19

## 🔒 安全原则

### 1. 隐私至上原则
- **最小数据收集**：仅收集功能必需的数据
- **用户同意**：所有数据收集均需用户明确授权
- **数据透明**：用户可查看和控制自己的数据

### 2. 开发者隐私保护
- **账号信息隔离**：开发者私人账号信息与代码分离
- **敏感配置保护**：API密钥、AppID等敏感信息不入库
- **Git安全**：完善的 .gitignore 保护策略

### 3. 代码安全防护
- **输入验证**：所有用户输入进行安全检查
- **数据加密**：敏感数据本地加密存储
- **访问控制**：云端数据严格权限管控

## 🛡️ 安全实施方案

### 一、开发者隐私保护

#### 1.1 Git仓库安全配置

**敏感文件保护列表**：
```gitignore
# 【安全重要】敏感信息保护
*.key
*.pem
config/secret.js
config/production.js
env.js
.env
.env.local
.env.production
project.private.config.json
appid.config.js

# 【安全重要】用户数据保护  
user-data/
logs/
crash-reports/
```

#### 1.2 AppID保护策略

**开发环境**：
- 使用测试AppID：`"touristappid"`
- 代码中添加安全注释提醒
- 真实AppID通过本地配置文件设置

**发布流程**：
```bash
# 1. 本地替换真实AppID
cp project.private.config.json project.config.json

# 2. 发布小程序
# 微信开发者工具上传

# 3. 恢复测试配置
git checkout project.config.json
```

#### 1.3 云开发环境隔离

```javascript
// 环境配置策略
const envConfig = {
  development: 'p-word-dev-test',
  production: 'p-word-prod'
}

wx.cloud.init({
  env: envConfig[process.env.NODE_ENV] || 'p-word-dev-test'
})
```

### 二、用户隐私数据保护

#### 2.1 数据收集策略

**✅ 允许收集的数据**：
- 录音权限状态（仅状态，不存储录音内容）
- 练习统计数据（次数、时长、分数）
- 学习进度信息
- 应用设置偏好

**❌ 严禁收集的数据**：
- 用户微信个人信息（昵称、头像、openid）
- 录音具体内容
- 设备通讯录、位置信息
- 其他与功能无关的隐私数据

#### 2.2 数据加密存储

```javascript
// 使用安全服务模块
const security = require('./services/security.js')

// 敏感数据加密存储
security.secureStorage('practice_stats', userStats)

// 非敏感数据正常存储
wx.setStorageSync('app_settings', settings)
```

#### 2.3 数据生命周期管理

| 数据类型 | 存储位置 | 保留时间 | 清理机制 |
|---------|---------|---------|---------|
| 练习统计 | 本地加密 | 30天 | 自动清理 |
| 录音临时文件 | 本地临时 | 24小时 | 应用启动时清理 |
| 应用设置 | 本地明文 | 永久 | 用户手动清除 |
| 云端备份 | 云数据库 | 7天 | 云函数定时清理 |

#### 2.4 权限申请透明化

```javascript
// 权限申请说明
wx.showModal({
  title: '录音权限说明',
  content: '我们需要录音权限用于英语口语练习功能。录音文件仅在您设备本地处理，不会上传到服务器。',
  showCancel: true,
  confirmText: '同意并开启',
  success: (res) => {
    if (res.confirm) {
      this.requestRecordAuth()
    }
  }
})
```

### 三、代码安全防护

#### 3.1 输入验证与过滤

```javascript
// 恶意输入检测
function validateUserInput(input) {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(input))
}

// 输入清理
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '')     // 移除HTML标签
    .replace(/['"]/g, '')     // 移除引号
    .trim()                   // 去除首尾空格
    .substring(0, 1000)       // 限制长度
}
```

#### 3.2 云数据库权限控制

```json
// 数据库权限规则 (database.rules.json)
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid && 
           doc.type == 'practice_record' && 
           doc.timestamp >= now - duration.days(7)"
}
```

#### 3.3 云函数安全措施

```javascript
// 云函数输入验证
exports.main = async (event, context) => {
  // 1. 参数验证
  const { data } = event
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid data format' }
  }
  
  // 2. 权限检查
  const { openid } = context.userInfo
  if (!openid) {
    return { error: 'Unauthorized' }
  }
  
  // 3. 数据清理
  const cleanData = sanitizeCloudData(data)
  
  // 4. 业务逻辑处理
  // ...
}
```

#### 3.4 API调用频率限制

```javascript
// 防止恶意调用
class RateLimiter {
  constructor(maxRequests = 100, timeWindow = 60000) {
    this.requests = new Map()
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
  }
  
  isAllowed(userId) {
    const now = Date.now()
    const userRequests = this.requests.get(userId) || []
    
    // 清理过期请求
    const validRequests = userRequests.filter(
      time => now - time < this.timeWindow
    )
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(userId, validRequests)
    return true
  }
}
```

### 四、运行时安全监控

#### 4.1 异常监控

```javascript
// 全局异常捕获
App({
  onError(error) {
    // 过滤敏感信息后上报
    const safeError = this.sanitizeError(error)
    console.error('应用异常:', safeError)
    
    // 可选：上报到错误监控服务（不包含敏感数据）
    // this.reportError(safeError)
  },
  
  sanitizeError(error) {
    return {
      message: error.message,
      stack: error.stack?.replace(/wx:\/\/[^\/]+/g, 'wx://***'), // 隐藏路径
      timestamp: Date.now()
    }
  }
})
```

#### 4.2 性能监控

```javascript
// 关键操作性能监控
function monitorPerformance(operation, fn) {
  const start = Date.now()
  
  return Promise.resolve(fn()).finally(() => {
    const duration = Date.now() - start
    console.log(`⏱️ ${operation} 耗时: ${duration}ms`)
    
    // 性能异常报警
    if (duration > 5000) {
      console.warn(`⚠️ ${operation} 性能异常`)
    }
  })
}
```

### 五、安全测试清单

#### 5.1 隐私保护测试

- [ ] ✅ 确认不收集用户微信个人信息
- [ ] ✅ 录音权限说明清晰透明
- [ ] ✅ 敏感数据本地加密存储
- [ ] ✅ 云端数据权限控制正确
- [ ] ✅ 数据自动清理机制有效

#### 5.2 代码安全测试

- [ ] ✅ 输入验证功能正常
- [ ] ✅ XSS攻击防护有效
- [ ] ✅ SQL注入防护（云数据库）
- [ ] ✅ API调用频率限制
- [ ] ✅ 异常处理不泄露敏感信息

#### 5.3 Git仓库安全

- [ ] ✅ .gitignore 规则完整
- [ ] ✅ 历史提交无敏感信息
- [ ] ✅ 测试AppID使用正确
- [ ] ✅ 安全注释提醒到位

### 六、安全应急预案

#### 6.1 数据泄露应急处理

1. **立即响应**（1小时内）
   - 关闭相关云服务
   - 评估泄露范围
   - 通知相关人员

2. **风险控制**（24小时内）
   - 修复安全漏洞
   - 重新部署服务
   - 更新访问密钥

3. **用户通知**（48小时内）
   - 发布安全公告
   - 指导用户防护
   - 提供补救措施

#### 6.2 恶意攻击防护

```javascript
// 攻击检测与防护
class SecurityMonitor {
  detectAttack(request) {
    const patterns = [
      /SELECT.*FROM/i,           // SQL注入
      /<script.*>/i,             // XSS攻击
      /\.\.\/.*\/etc\/passwd/i,  // 路径遍历
      /eval\s*\(/i              // 代码注入
    ]
    
    return patterns.some(pattern => 
      pattern.test(JSON.stringify(request))
    )
  }
  
  blockMaliciousUser(userId) {
    const blockKey = `blocked_${userId}`
    wx.setStorageSync(blockKey, {
      timestamp: Date.now(),
      reason: 'malicious_activity'
    })
  }
}
```

### 七、合规性要求

#### 7.1 微信小程序平台规范

- ✅ 遵循《微信小程序平台规范》
- ✅ 符合《微信小程序隐私保护指引》
- ✅ 满足录音权限使用规范

#### 7.2 数据保护法律法规

- ✅ 符合《个人信息保护法》要求
- ✅ 遵循最小必要原则
- ✅ 用户知情同意机制

#### 7.3 行业安全标准

- ✅ 参考ISO 27001信息安全管理
- ✅ 遵循OWASP安全开发指南
- ✅ 符合移动应用安全最佳实践

---

## 📋 安全检查清单

### 开发阶段
- [x] Git仓库安全配置
- [x] 代码中移除敏感信息
- [x] 输入验证机制实现
- [x] 数据加密模块开发
- [x] 权限控制逻辑编写

### 测试阶段
- [ ] 隐私保护功能测试
- [ ] 安全漏洞扫描
- [ ] 恶意输入测试
- [ ] 权限控制验证
- [ ] 数据加密验证

### 发布阶段
- [ ] AppID安全替换
- [ ] 云环境权限检查
- [ ] 隐私政策发布
- [ ] 安全监控启用
- [ ] 应急响应准备

---

> **安全承诺**：P-Word 致力于保护用户隐私和数据安全，严格遵循相关法律法规，持续改进安全防护措施。
> 
> **联系方式**：如发现安全问题，请通过 GitHub Issues 或邮件联系开发者。 