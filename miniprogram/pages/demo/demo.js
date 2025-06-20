/**
 * P-Word 功能演示页面
 * 用于开发验收和功能展示
 */

const audioService = require('../../services/audioService.js')
const sentenceService = require('../../services/sentenceService.js')
const cloudService = require('../../services/cloudService.js')
const security = require('../../services/security.js')

Page({
  data: {
    // 当前开发日
    currentDay: 2,
    
    // Demo导航
    currentTab: 0,
    tabs: [
      { name: '录音测试', icon: '🎤' },
      { name: '语料库', icon: '📚' },
      { name: '云同步', icon: '☁️' },
      { name: '数据分析', icon: '📊' }
    ],
    
    // 录音测试相关
    isRecording: false,
    hasRecording: false,
    recordDuration: 0,
    audioQuality: null,
    waveData: [],
    testResults: {
      recording: null,
      quality: null,
      playback: null
    },
    
    // 语料库测试
    currentSentence: null,
    recommendationMode: 'smart',
    availableCategories: [],
    selectedCategory: '',
    sentenceStats: {
      total: 0,
      byLevel: {},
      byCategory: {}
    },
    
    // 云同步测试
    syncStatus: {
      isOnline: true,
      queueLength: 0,
      lastSyncTime: 0
    },
    syncTestResults: [],
    
    // 数据分析
    practiceHistory: [],
    statistics: {
      totalPractices: 0,
      totalTime: 0,
      avgQuality: 0,
      bestScore: 0
    },
    
    // 性能监控
    performanceMetrics: {
      memoryUsage: 0,
      responseTime: 0,
      renderTime: 0
    },
    
    // 测试日志
    testLogs: [],
    showDebugPanel: false
  },

  onLoad() {
    console.log('🎬 Demo页面加载')
    this.initDemo()
  },

  // 初始化Demo环境
  async initDemo() {
    this.addLog('🎬 Demo环境初始化开始')
    
    try {
      // 初始化各个服务
      await this.initServices()
      
      // 加载测试数据
      await this.loadTestData()
      
      // 启动性能监控
      this.startPerformanceMonitoring()
      
      this.addLog('✅ Demo环境初始化完成')
      
    } catch (error) {
      this.addLog(`❌ Demo初始化失败: ${error.message}`)
    }
  },

  // 初始化服务
  async initServices() {
    // 初始化录音服务
    audioService.setEventHandlers({
      onRecordStart: () => {
        this.setData({ isRecording: true })
        this.addLog('🎤 录音开始')
        this.updateTestResult('recording', 'started')
      },
      
      onRecordStop: (result) => {
        const quality = audioService.analyzeAudioQuality()
        this.setData({
          isRecording: false,
          hasRecording: true,
          audioQuality: quality
        })
        this.addLog(`🎤 录音完成，质量评分: ${quality && quality.overall || 'N/A'}`)
        this.updateTestResult('recording', 'completed')
                  this.updateTestResult('quality', quality && quality.overall || 0)
      },
      
      onFrameRecorded: (waveData) => {
        this.updateWaveform(waveData)
      }
    })
    
    // 初始化语料库
    await sentenceService.initService()
    const categories = sentenceService.getAllCategories()
    const totalSentences = sentenceService.getTotalCount()
    
    this.setData({
      availableCategories: categories,
      'sentenceStats.total': totalSentences
    })
    
    // 初始化云服务
    cloudService.initService()
    this.updateSyncStatus()
  },

  // 加载测试数据
  async loadTestData() {
    // 加载练习历史
    const history = security.secureGet('practice_history') || []
    
    // 计算统计数据
    const stats = this.calculateStatistics(history)
    
    this.setData({
      practiceHistory: history.slice(0, 10), // 只显示最近10条
      statistics: stats
    })
    
    this.addLog(`📊 加载了${history.length}条练习记录`)
  },

  // Tab切换
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentTab: index })
    this.addLog(`📱 切换到${this.data.tabs[index].name}`)
  },

  // ===================
  // 录音功能测试
  // ===================
  
  // 开始录音测试
  startRecordingTest() {
    if (!this.data.isRecording) {
      const startTime = Date.now()
      audioService.startRecording()
      this.startTimer(startTime)
      this.addLog('🎤 开始录音测试')
    }
  },

  // 停止录音测试
  stopRecordingTest() {
    if (this.data.isRecording) {
      audioService.stopRecording()
      this.stopTimer()
      this.addLog('⏹️ 停止录音测试')
    }
  },

  // 播放录音测试
  async playRecordingTest() {
    if (this.data.hasRecording) {
      try {
        this.addLog('▶️ 开始播放测试')
        await audioService.playRecording()
        this.updateTestResult('playback', 'success')
        this.addLog('✅ 播放测试完成')
      } catch (error) {
        this.updateTestResult('playback', 'failed')
        this.addLog(`❌ 播放测试失败: ${error.message}`)
      }
    }
  },

  // ===================
  // 语料库功能测试
  // ===================
  
  // 测试智能推荐
  testSmartRecommendation() {
    this.setData({ recommendationMode: 'smart' })
    const sentence = sentenceService.getRecommendedSentence({ smartRecommend: true })
    this.setData({ currentSentence: sentence })
    this.addLog(`🧠 智能推荐: ${sentence.content}`)
  },

  // 测试分类筛选
  testCategoryFilter(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category })
    
    const sentences = sentenceService.getSentencesByCategory(category)
    if (sentences.length > 0) {
      this.setData({ currentSentence: sentences[0] })
      this.addLog(`📂 分类筛选[${category}]: 找到${sentences.length}句`)
    }
  },

  // 测试随机推荐
  testRandomRecommendation() {
    this.setData({ recommendationMode: 'random' })
    const sentences = sentenceService.sentences
    const randomIndex = Math.floor(Math.random() * sentences.length)
    const sentence = sentences[randomIndex]
    this.setData({ currentSentence: sentence })
    this.addLog(`🔀 随机推荐: ${sentence.content}`)
  },

  // ===================
  // 云同步功能测试
  // ===================
  
  // 测试在线同步
  async testOnlineSync() {
    try {
      this.addLog('☁️ 测试在线同步...')
      
      const mockRecord = {
        id: `test_${Date.now()}`,
                 content: this.data.currentSentence && this.data.currentSentence.content || 'Test sentence',
        duration: 10,
        quality: 75,
        timestamp: Date.now()
      }
      
      const result = await cloudService.syncPracticeRecord(mockRecord)
      
      this.addSyncTestResult('在线同步', result.success)
      this.updateSyncStatus()
      this.addLog('✅ 在线同步测试完成')
      
    } catch (error) {
      this.addSyncTestResult('在线同步', false)
      this.addLog(`❌ 在线同步测试失败: ${error.message}`)
    }
  },

  // 测试离线模式
  async testOfflineMode() {
    try {
      this.addLog('📱 测试离线模式...')
      
      // 模拟网络断开
      cloudService.isOnline = false
      
      const mockRecord = {
        id: `offline_test_${Date.now()}`,
        content: 'Offline test sentence',
        duration: 8,
        quality: 80,
        timestamp: Date.now()
      }
      
      const result = await cloudService.syncPracticeRecord(mockRecord)
      
      this.addSyncTestResult('离线模式', result.offline === true)
      this.updateSyncStatus()
      
      // 模拟网络恢复
      setTimeout(() => {
        cloudService.isOnline = true
        cloudService.processSyncQueue()
        this.addLog('🔄 模拟网络恢复，开始同步队列')
        this.updateSyncStatus()
      }, 2000)
      
      this.addLog('✅ 离线模式测试完成')
      
    } catch (error) {
      this.addSyncTestResult('离线模式', false)
      this.addLog(`❌ 离线模式测试失败: ${error.message}`)
    }
  },

  // 测试手动同步
  async testManualSync() {
    try {
      this.addLog('🔄 测试手动同步...')
      
      const result = await cloudService.manualSync()
      
      this.addSyncTestResult('手动同步', result.success)
      this.updateSyncStatus()
      this.addLog('✅ 手动同步测试完成')
      
    } catch (error) {
      this.addSyncTestResult('手动同步', false)
      this.addLog(`❌ 手动同步测试失败: ${error.message}`)
    }
  },

  // ===================
  // 工具方法
  // ===================
  
  // 更新波形数据
  updateWaveform(waveData) {
    const currentWave = this.data.waveData
    const newWave = [...currentWave, ...waveData].slice(-50) // 保持最近50个数据点
    this.setData({ waveData: newWave })
  },

  // 开始计时器
  startTimer(startTime) {
    this.timer = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      this.setData({ recordDuration: duration })
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 更新测试结果
  updateTestResult(type, result) {
    this.setData({
      [`testResults.${type}`]: result
    })
  },

  // 更新同步状态
  updateSyncStatus() {
    const status = cloudService.getSyncStatus()
    this.setData({ syncStatus: status })
  },

  // 添加同步测试结果
  addSyncTestResult(testName, success) {
    const result = {
      name: testName,
      success: success,
      time: new Date().toLocaleTimeString()
    }
    
    const results = [...this.data.syncTestResults, result]
    this.setData({ syncTestResults: results })
  },

  // 计算统计数据
  calculateStatistics(history) {
    if (history.length === 0) {
      return {
        totalPractices: 0,
        totalTime: 0,
        avgQuality: 0,
        bestScore: 0
      }
    }

    const totalPractices = history.length
    const totalTime = history.reduce((sum, h) => sum + (h.duration || 0), 0)
    const avgQuality = history.reduce((sum, h) => sum + (h.quality || 0), 0) / totalPractices
    const bestScore = Math.max(...history.map(h => h.quality || 0))

    return {
      totalPractices,
      totalTime: Math.round(totalTime / 60), // 转换为分钟
      avgQuality: Math.round(avgQuality),
      bestScore
    }
  },

  // 启动性能监控
  startPerformanceMonitoring() {
    setInterval(() => {
      // 模拟性能数据
      const metrics = {
        memoryUsage: Math.round(Math.random() * 100),
        responseTime: Math.round(Math.random() * 100 + 50),
        renderTime: Math.round(Math.random() * 50 + 10)
      }
      
      this.setData({ performanceMetrics: metrics })
    }, 5000)
  },

  // 添加日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const log = `[${timestamp}] ${message}`
    
    const logs = [log, ...this.data.testLogs].slice(0, 50) // 保持最近50条日志
    this.setData({ testLogs: logs })
    
    console.log(log)
  },

  // 切换调试面板
  toggleDebugPanel() {
    this.setData({ showDebugPanel: !this.data.showDebugPanel })
  },

  // 清空测试数据
  clearTestData() {
    this.setData({
      testResults: { recording: null, quality: null, playback: null },
      syncTestResults: [],
      testLogs: [],
      waveData: [],
      hasRecording: false,
      audioQuality: null
    })
    this.addLog('🧹 测试数据已清空')
  },

  // 导出测试报告
  exportTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.data.testResults,
      syncResults: this.data.syncTestResults,
      statistics: this.data.statistics,
      performanceMetrics: this.data.performanceMetrics,
      logs: this.data.testLogs.slice(0, 20)
    }
    
    const reportString = JSON.stringify(report, null, 2)
    
    wx.setClipboardData({
      data: reportString,
      success: () => {
        wx.showToast({
          title: '测试报告已复制到剪贴板',
          icon: 'success'
        })
        this.addLog('📋 测试报告已导出到剪贴板')
      }
    })
  },

  onUnload() {
    // 清理资源
    if (this.timer) {
      clearInterval(this.timer)
    }
    audioService.cleanup()
  }
}) 