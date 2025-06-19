## 一、技术框架选型

### 1. 整体架构

```
graph TD
    A[微信小程序客户端] --> B[微信云开发]
    B --> C[云函数]
    B --> D[云数据库]
    B --> E[云存储]
    
    A --> F[本地缓存]
    C --> G[第三方服务]
```

### 2. 技术栈明细

| 模块    | 技术方案                    | 说明          |
| ----- | ----------------------- | ----------- |
| 前端框架  | 微信小程序原生框架 + WXML/WXSS   | 最佳兼容性       |
| 状态管理  | 小程序自带Page/Component状态管理 | 简单场景无需Redux |
| 云服务   | 微信云开发                   | 免运维，无缝集成    |
| 录音处理  | wx.getRecorderManager() | 原生录音API     |
| 音频可视化 | Canvas 2D               | 性能优先        |
| 数据存储  | 本地缓存 + 云数据库             | 双轨存储        |
| 构建工具  | 微信开发者工具                 | 官方IDE支持     |

## 二、技术架构设计

### 1. 系统架构图

```
graph LR
    UI[用户界面] --> Logic[业务逻辑]
    Logic --> Storage[数据层]
    Storage -->|本地| Local[本地缓存]
    Storage -->|云端| Cloud[云开发]
    
    Cloud --> DB[云数据库]
    Cloud --> CF[云函数]
    Cloud --> FS[云存储]
    
    Logic --> Service[基础服务]
    Service --> Audio[录音服务]
    Service --> Canvas[可视化服务]
```

### 2. 分层架构

|层级|组件|职责|
|---|---|---|
|展示层|WXML页面|UI渲染，用户交互|
|逻辑层|JS逻辑文件|业务逻辑处理|
|服务层|云函数/本地服务|数据存取，录音处理|
|存储层|本地缓存/云存储|数据持久化|

## 三、项目结构设计

```
p-word/
├── miniprogram/               # 小程序前端代码
│   ├── components/            # 通用组件
│   │   ├── recorder-btn/      # 录音按钮组件
│   │   ├── wave-display/      # 波形显示组件
│   │   └── sentence-card/     # 句子卡片组件
│   ├── pages/
│   │   ├── index/             # 主页（练习页）
│   │   ├── history/           # 历史记录页
│   │   └── library/           # 语料库管理页
│   ├── services/              # 服务层
│   │   ├── audioService.js    # 录音服务
│   │   ├── dbService.js       # 数据库服务
│   │   └── util.js            # 工具函数
│   ├── assets/                # 静态资源
│   │   ├── icons/             # 图标
│   │   └── sentences/         # 默认语料库
│   ├── app.js                 # 全局逻辑
│   ├── app.json               # 全局配置
│   └── app.wxss               # 全局样式
│
├── cloudfunctions/            # 云函数目录
│   ├── syncData/              # 数据同步云函数
│   └── autoClean/             # 自动清理云函数
│
└── project.config.json        # 项目配置文件
```

## 四、核心模块设计

### 1. 录音管理模块

**类图设计：**

```
classDiagram
    class AudioRecorder {
        +recorderManager: RecorderManager
        +isRecording: boolean
        +audioPath: string
        +startRecording() void
        +stopRecording() void
        +playRecording() void
        +onFrameRecorded(callback) void
    }
```

**关键实现：**

```
// services/audioService.js
class AudioRecorder {
  constructor() {
    this.recorderManager = wx.getRecorderManager()
    this.isRecording = false
    this.audioPath = ''
  }

  startRecording() {
    this.recorderManager.start({
      format: 'mp3',
      frameSize: 1024 // 每帧大小
    })
    this.isRecording = true
  }

  stopRecording() {
    this.recorderManager.stop()
    this.isRecording = false
  }

  onFrameRecorded(callback) {
    this.recorderManager.onFrameRecorded((res) => {
      callback(res.frameBuffer)
    })
  }
}
```

### 2. 波形可视化模块

**Canvas绘制流程：**

```
sequenceDiagram
    participant UI as 界面
    participant Audio as 录音服务
    participant Canvas as Canvas组件
    
    UI->>Audio: 开始录音
    Audio->>Canvas: 发送音频帧数据
    Canvas->>Canvas: 转换数据为波形点
    Canvas->>Canvas: 绘制波形路径
    UI->>Canvas: 渲染更新
```

**关键实现：**

```
// components/wave-display.js
Component({
  methods: {
    drawWaveform(frames) {
      const ctx = wx.createCanvasContext('waveCanvas', this)
      const width = this.data.canvasWidth
      const height = this.data.canvasHeight
      
      ctx.clearRect(0, 0, width, height)
      ctx.beginPath()
      ctx.moveTo(0, height/2)
      
      // 简化的波形绘制算法
      for(let i = 0; i < width; i++) {
        const index = Math.floor(i * frames.length / width)
        const value = frames[index] / 255 * height
        ctx.lineTo(i, height/2 - value/2)
      }
      
      ctx.stroke()
      ctx.draw()
    }
  }
})
```

### 3. 数据存储模块

**存储策略：**

```
graph TB
    A[新数据产生] --> B{数据大小}
    B -->|小于100KB| C[本地缓存]
    B -->|大于100KB| D[云存储]
    C --> E[定期同步到云端]
    D --> F[记录存储路径]
```

**数据结构设计：**

```
// 练习记录数据结构
{
  _id: 'record_202306191230', // 唯一ID
  date: '2023-06-19',         // 练习日期
  duration: 120,              // 练习时长(秒)
  sentences: [                // 练习句子
    {
      id: 'sentence_001',
      content: 'Hello, how are you?',
      attempts: 3             // 尝试次数
    }
  ],
  audioPath: 'cloud://audio/20230619/1230.mp3' // 录音路径
}
```

## 五、接口设计

### 1. 本地存储接口

|方法名|参数|返回值|说明|
|---|---|---|---|
|savePracticeLog|(log: Object)|boolean|保存练习记录|
|getHistory|(dateRange: {start, end})|Array|获取历史记录|
|getSentence|(id: string)|Object|获取单条句子|
|importSentences|(text: string)|number|导入自定义句子|

### 2. 云函数接口

**数据同步云函数（syncData）**

```
/**
 * 同步本地数据到云端
 * @param {Object} data - 待同步数据
 * @returns {Object} 同步结果
 */
exports.main = async (event) => {
  const db = cloud.database()
  const result = await db.collection('practice_logs').add({
    data: event.data
  })
  
  return {
    code: 200,
    data: result
  }
}
```

**自动清理云函数（autoClean）**

```
// 自动清理7天前的录音文件
exports.main = async (event) => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const result = await cloud.deleteFile({
    fileList: await getExpiredFiles(sevenDaysAgo)
  })
  
  return {
    deleted: result.fileList
  }
}
```

## 六、性能优化方案

### 1. 录音性能优化

- 使用worker线程处理音频帧数据
- 限制波形绘制频率：每100ms绘制一次
- 使用二进制数组存储原始音频数据

### 2. 数据加载优化

- 分页加载历史记录
- 使用云开发数据库索引：
    
    ```
    // 数据库索引配置
    {
      "fields": ["date", "duration"],
      "unique": false
    }
    ```
    

### 3. 存储优化策略

|数据类型|存储位置|清理策略|
|---|---|---|
|练习记录元数据|本地缓存|保留30天|
|录音文件|云存储|7天自动清理|
|用户收藏句子|本地+云备份|永久保留|

## 七、安全设计

### 1. 数据安全

- 敏感数据加密：使用wx.setStorageSync加密存储
- 云数据权限控制：
    
    ```
    // 云数据库权限规则
    {
      "read": "auth.openid == doc._openid",
      "write": "auth.openid == doc._openid"
    }
    ```
    

### 2. 内容安全

- 用户自定义内容过滤：
    
    ```
    // 使用微信内容安全API
    wx.cloud.callFunction({
      name: 'contentCheck',
      data: { content: userInput }
    })
    ```
    

## 八、部署方案

### 1. 云环境初始化

```
# 通过微信开发者工具
1. 创建云开发环境
2. 初始化数据库集合（practice_logs, sentences）
3. 上传云函数并配置定时触发器
```

### 2. 发布流程

```
sequenceDiagram
    开发者->>微信开发者工具: 代码上传
    微信开发者工具->>微信服务器: 提交审核
    微信服务器-->>开发者: 审核结果通知
    开发者->>微信服务器: 发布版本
    微信服务器->>用户: 小程序更新
```

---

**技术设计原则**：

1. **轻量化**：核心功能包大小控制在1MB内
2. **离线优先**：核心功能支持离线使用
3. **渐进增强**：基础功能先行，AI功能后期扩展
4. **成本控制**：充分利用云开发免费配额

> 关键提示：微信小程序录音功能需在app.json中声明
> 
> ```
> "requiredPrivateInfos": ["getRecorderManager"]
> ```