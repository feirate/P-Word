## 一、本地化语音评分方案设计

### 1. 核心设计思路

在不依赖外部AI接口的情况下，采用**音频特征分析+文本匹配**的混合方案：

```
graph TD
    A[用户录音] --> B{特征提取}
    B --> C[语速分析]
    B --> D[音量稳定性]
    B --> E[停顿检测]
    B --> F[音高变化]
    A --> G{文本匹配}
    G --> H[语音转文本]
    G --> I[文本相似度]
    C & D & E & F & H & I --> J[综合评分]
```

### 2. 可行性分析

| 评分维度  | 可实现性  | 技术方案          | 精度预期 |
| ----- | ----- | ------------- | ---- |
| 语速    | ★★★★☆ | 音频时长/文本长度计算   | 较高   |
| 流畅度   | ★★★☆☆ | 长停顿检测+重复词识别   | 中等   |
| 音量稳定性 | ★★★★☆ | 振幅方差计算        | 较高   |
| 发音准确度 | ★★☆☆☆ | 简易语音转文本+文本相似度 | 较低   |
| 语调    | ★★☆☆☆ | 基频(F0)变化分析    | 较低   |

## 二、技术实现方案

### 1. 音频特征分析模块

#### 核心类设计

```
classDiagram
    class AudioAnalyzer {
        +audioBuffer: ArrayBuffer
        +sampleRate: number
        +analyzeSpeed() number
        +analyzeVolumeStability() number
        +detectPauses() Array
        +calculatePitch() Array
    }
```

#### 关键实现代码

```
// services/audioAnalyzer.js
class AudioAnalyzer {
  constructor(audioBuffer, sampleRate = 16000) {
    this.audioBuffer = audioBuffer;
    this.sampleRate = sampleRate;
  }

  // 语速分析（词/分钟）
  analyzeSpeed(text) {
    const wordCount = text.split(' ').length;
    const duration = this.audioBuffer.byteLength / (this.sampleRate * 2); // 16bit采样
    return Math.round((wordCount / duration) * 60);
  }

  // 音量稳定性（0-100分）
  analyzeVolumeStability() {
    const amplitudes = this._getAmplitudes();
    const avg = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const variance = amplitudes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amplitudes.length;
    return Math.max(0, 100 - Math.sqrt(variance) * 10);
  }

  // 停顿检测
  detectPauses(threshold = 0.1) {
    const pauses = [];
    const amplitudes = this._getAmplitudes();
    let pauseStart = null;
    
    for (let i = 0; i < amplitudes.length; i++) {
      if (amplitudes[i] < threshold && pauseStart === null) {
        pauseStart = i;
      } else if (amplitudes[i] >= threshold && pauseStart !== null) {
        pauses.push({
          start: pauseStart / this.sampleRate,
          duration: (i - pauseStart) / this.sampleRate
        });
        pauseStart = null;
      }
    }
    
    return pauses;
  }

  // 内部方法：获取振幅数组
  _getAmplitudes() {
    const dataView = new DataView(this.audioBuffer);
    const amplitudes = [];
    
    for (let i = 0; i < dataView.byteLength; i += 2) {
      const sample = dataView.getInt16(i, true);
      amplitudes.push(Math.abs(sample) / 32768); // 归一化到0-1
    }
    
    return amplitudes;
  }
}
```

### 2. 简易语音识别方案

#### 基于WebAssembly的语音识别

```
sequenceDiagram
    participant User as 用户
    participant App as 小程序
    participant Wasm as WebAssembly模块
    
    User->>App: 录音输入
    App->>Wasm: 发送音频数据
    Wasm->>Wasm: 特征提取(MFCC)
    Wasm->>Wasm: 匹配预训练模型
    Wasm->>App: 返回识别文本
```

#### 实现步骤：

1. **预训练模型**：
    
    - 使用Python训练小型语音识别模型（100个核心句子）
    - 转换为TensorFlow.js格式
    - 通过微信小程序WASM支持加载
2. **前端识别流程**：
    
    ```
    // services/localSpeechRecognition.js
    async function recognize(audioBuffer) {
      // 加载WASM模块
      const { ModelRunner } = await import('./wasm/speechModel');
      
      // 初始化模型
      const model = new ModelRunner();
      await model.load();
      
      // 预处理音频
      const features = extractMFCC(audioBuffer);
      
      // 执行识别
      const result = model.predict(features);
      return result.text;
    }
    
    // MFCC特征提取（简化版）
    function extractMFCC(buffer) {
      // 实际实现需要完整的MFCC算法
      return simplifiedMFCC(buffer);
    }
    ```
    

### 3. 综合评分算法

```
// services/scoreCalculator.js
function calculateScore(audioData, referenceText) {
  const analyzer = new AudioAnalyzer(audioData);
  
  // 各维度评分
  const speedScore = calculateSpeedScore(analyzer.analyzeSpeed(referenceText));
  const fluencyScore = calculateFluencyScore(analyzer.detectPauses());
  const volumeScore = analyzer.analyzeVolumeStability();
  
  // 文本相似度评分
  const recognizedText = recognize(audioData); // 使用本地语音识别
  const similarityScore = calculateSimilarity(recognizedText, referenceText);
  
  // 综合评分（加权平均）
  return {
    total: Math.round(
      speedScore * 0.3 +
      fluencyScore * 0.3 +
      volumeScore * 0.2 +
      similarityScore * 0.2
    ),
    details: {
      speed: speedScore,
      fluency: fluencyScore,
      volume: volumeScore,
      accuracy: similarityScore
    }
  };
}

// 示例评分计算函数
function calculateSpeedScore(wordsPerMinute) {
  const ideal = 150; // 理想语速
  const diff = Math.abs(wordsPerMinute - ideal);
  return Math.max(0, 100 - diff * 0.5);
}

function calculateFluencyScore(pauses) {
  const longPauses = pauses.filter(p => p.duration > 0.5).length;
  return Math.max(0, 100 - longPauses * 10);
}

function calculateSimilarity(text1, text2) {
  // 使用Levenshtein距离计算相似度
  const distance = levenshteinDistance(text1, text2);
  const maxLen = Math.max(text1.length, text2.length);
  return Math.round((1 - distance / maxLen) * 100);
}
```

## 三、技术架构升级

### 1. 更新后的架构图

```
graph TD
    A[前端] --> B[录音模块]
    A --> C[评分引擎]
    C --> D[音频分析]
    C --> E[本地语音识别]
    D --> F[特征提取]
    E --> G[WASM模型]
    F & G --> H[评分计算]
    H --> A[显示结果]
    
    subgraph 本地资源
    G[WASM模型]
    I[预训练模型数据]
    end
```

### 2. 性能优化措施

1. **模型精简**：
    
    - 仅包含100个核心句子的识别能力
    - 量化模型权重（Float32→Int8）
    - 模型大小控制在300KB以内
2. **计算优化**：
    
    ```
    // 使用Web Worker后台计算
    const scoreWorker = wx.createWorker('workers/scoreCalculator.js')
    
    // 主线程
    scoreWorker.postMessage({
      audioData: recordedAudio,
      referenceText: currentSentence
    })
    
    scoreWorker.onMessage(res => {
      updateScore(res.result)
    })
    ```
    
3. **渐进式识别**：
    
    - 首次加载只下载核心模型（50KB）
    - 按需加载扩展模型包

## 四、项目结构更新

```
p-word/
├── miniprogram/
│   ├── wasm/                   # 新增WASM模块
│   │   ├── speechModel.wasm    # 语音识别模型
│   │   └── wasm-loader.js       # WASM加载器
│   │
│   ├── workers/                # 新增Web Workers
│   │   └── scoreCalculator.js  # 评分计算Worker
│   │
│   ├── services/
│   │   ├── audioAnalyzer.js     # 音频分析服务
│   │   ├── localSpeechRecognition.js # 本地语音识别
│   │   └── scoreCalculator.js   # 评分服务
│   │
│   └── ... # 其他原有目录
│
└── ... # 其他原有目录
```

## 五、接口扩展设计

### 1. 新增前端接口

```
// 开始评分
function startEvaluation(referenceText) {
  return {
    type: 'START_EVALUATION',
    payload: { referenceText }
  }
}

// 评分结果
function evaluationResult(score) {
  return {
    type: 'EVALUATION_RESULT',
    payload: score
  }
}
```

### 2. 评分结果数据结构

```
{
  "totalScore": 78,
  "details": {
    "speed": {
      "score": 85,
      "value": "142 WPM",
      "feedback": "语速稍快，建议放慢"
    },
    "fluency": {
      "score": 70,
      "value": "3次长停顿",
      "feedback": "注意句子连贯性"
    },
    "volume": {
      "score": 90,
      "value": "稳定",
      "feedback": "音量控制良好"
    },
    "accuracy": {
      "score": 65,
      "value": "85%匹配",
      "feedback": "注意单词发音"
    }
  }
}
```

## 六、局限性及应对方案

|局限性|应对方案|
|---|---|
|发音精度有限|聚焦常见错误模式，提供通用发音建议|
|模型覆盖句子有限|允许用户标记无法评分的句子，后期扩展模型|
|性能消耗较大|提供关闭评分选项，使用Web Worker后台计算|
|复杂句子识别率低|对长句自动分段评分|

## 七、实施路线图

```
dateFormat  YYYY-MM-DD
section 评分模块开发
WASM基础框架       ：2025-07-01, 5d
音频特征分析       ：2025-07-06, 4d 
本地语音识别       ：2025-07-10, 6d 
评分算法集成       ：2025-07-16, 3d 
性能优化           ：2025-07-19, 3d 

section 模型训练
核心句子收集       ：2025-07-01, 3d 
模型训练           ：2025-07-04, 5d 
模型量化转换       ：2025-07-09, 2d 
```

> **实施建议**：
> 
> 1. 首期实现基础特征分析（语速/流畅度/音量），满足60%评分需求
> 2. 二期引入简易语音识别，覆盖发音准确度评估
> 3. 渐进式扩展模型库，根据用户反馈优化评分算法
> 4. 始终提供「跳过评分」选项，确保核心练习功能不受影响

此方案可在无需外部AI接口的情况下实现基本语音评分功能，虽然精度有限，但能满足自主练习的反馈需求，且完全符合微信小程序平台规范。