const app = getApp()
// 引入安全服务模块
const security = require('../../services/security.js')
// 引入高质量录音服务模块
const audioService = require('../../services/audioService.js')
// 引入智能语料库服务模块
const sentenceService = require('../../services/sentenceService.js')
// 引入云数据同步服务模块
const cloudService = require('../../services/cloudService.js')
// 引入语音朗读服务模块
const ttsService = require('../../services/ttsService.js')

Page({
  data: {
    // 基础数据
    currentDate: '',
    todayPracticeTime: 0,
    
    // 句子相关
    currentSentence: null,
    currentIndex: 0,
    totalSentences: 0,
    showTranslation: false,
    
    // 语料库相关
    availableCategories: [],
    selectedCategory: '',
    recommendationMode: 'smart', // 'smart', 'sequential', 'random'
    
    // 级别和分类选择
    availableLevels: ['全部', '初级', '中级', '高级'],
    selectedLevel: '全部',
    selectedLevelIndex: 0,
    categoryOptions: ['全部'],
    selectedCategoryDisplay: '全部',
    selectedCategoryIndex: 0,
    
    // 云同步相关
    syncStatus: {
      isOnline: true,
      queueLength: 0,
      lastSyncTime: 0
    },
    showSyncIndicator: false,
    
    // 录音相关
    isRecording: false,
    hasRecording: false,
    recordAuth: false,
    recordDuration: 0,
    recordDurationText: '00:00',
    audioPath: '',
    
    // 波形相关
    canvasWidth: 0,
    canvasHeight: 100, // 多邻国风格更高的波形区域
    waveData: [],
    
    // 录音质量分析
    audioQuality: null,
    showQualityTip: false,
    
    // 练习统计
    practiceStats: {
      sentenceCount: 0,
      totalTime: 0,
      bestScore: null
    },
    
    // UI状态
    showAuthModal: false,
    
    // 游戏化数据
    practiceStreak: 0,           // 连续练习天数
    dailyGoal: 20,               // 日常目标句数
    goalPercentage: 0,           // 目标完成百分比
    todayAchievements: [],       // 今日获得的成就
    difficultyStars: '',         // 难度星星显示
    
    // TTS 相关
    isTTSPlaying: false,         // TTS播放状态
    autoPlayEnabled: true,       // 自动朗读功能
    
    // 录音播放状态
    isPlaying: false,            // 录音播放状态
  },

  async onLoad() {
    console.log('📱 练习页面加载')
    
    // 【安全】清理过期数据
    security.cleanExpiredData()
    
    // 初始化页面数据
    this.initPageData()
    
    // 检查录音权限并等待结果
    const hasRecordAuth = await this.checkRecordAuth()
    
    // 注意：checkRecordAuth内部已经会在权限存在时初始化音频服务
    // 这里只需要记录状态即可
    if (hasRecordAuth) {
      console.log('✅ 录音权限检查完成，音频服务已初始化')
    } else {
      console.log('⚠️ 暂无录音权限，等待用户授权后再初始化音频服务')
    }
    
    // 初始化Canvas
    this.initCanvas()
    
    // 初始化语料库系统
    await this.initSentenceSystem()
    
    // 初始化云同步服务
    this.initCloudSync()
    
    // 加载今日统计（使用安全存储）- 必须在游戏数据初始化之前
    this.loadTodayStats()
    
    // 等待统计数据加载完成后初始化游戏化数据
    setTimeout(() => {
      this.initGameData()
    }, 100)
    
    // 加载TTS设置
    this.loadTTSSettings()
    
    // 加载每日目标设置
    this.loadDailyGoalSettings()
    
    // 初始化TTS权限（延迟执行，避免阻塞页面）
    setTimeout(() => {
      this.initTTSPermissions()
    }, 1000)
  },

  // 初始化TTS权限
  async initTTSPermissions() {
    try {
      console.log('🔐 开始初始化TTS权限')
      await ttsService.requestPermissions()
      console.log('✅ TTS权限初始化完成')
    } catch (error) {
      console.warn('⚠️ TTS权限初始化失败:', error)
    }
  },

  onShow() {
    // 页面显示时更新数据
    this.loadTodayStats()
  },

  // 初始化页面数据（性能优化版）
  initPageData() {
    // 性能监控：记录初始化开始时间
    const initStartTime = Date.now()
    
    const date = new Date()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const currentDate = `${month}.${day}`
    this.setData({ currentDate })
    
    // 性能监控：记录初始化完成时间
    const initTime = Date.now() - initStartTime
    console.log(`⚡ 页面数据初始化耗时: ${initTime}ms`)
    
    // 存储性能指标
    this.performanceMetrics = {
      initTime,
      renderTimes: [],
      startTime: Date.now()
    }
  },

  // 检查录音权限（增强版）
  async checkRecordAuth() {
    try {
      // 实时检查权限状态
      const result = await wx.getSetting()
      const recordAuth = !!result.authSetting['scope.record']
      
      // 更新全局数据和页面数据
      app.globalData.recordAuth = recordAuth
      this.setData({ recordAuth })
      
      console.log('🔍 录音权限检查结果:', {
        authorized: recordAuth,
        authSetting: result.authSetting
      })
      
      if (!recordAuth) {
        console.log('⚠️ 录音权限未授权，需要用户主动申请')
      } else {
        console.log('✅ 录音权限已授权')
        // 权限已授权，初始化音频服务
        this.initAudioService()
      }
      
      return recordAuth
    } catch (error) {
      console.error('❌ 权限检查失败:', error)
      this.setData({ recordAuth: false })
      return false
    }
  },

  // 初始化高质量录音服务
  initAudioService() {
    // 设置录音服务事件回调
    audioService.setEventHandlers({
      onRecordStart: () => {
        console.log('🎤 高质量录音开始')
        this.setData({ 
          isRecording: true,
          recordDuration: 0,
          waveData: [],
          audioQuality: null
        })
        
        // 确保Canvas已初始化（因为现在Canvas会显示）
        setTimeout(() => {
          this.ensureCanvasInitialized()
        }, 50)
        
        this.startRecordTimer()
      },
      
      onRecordStop: (result) => {
        console.log('🎤 录音完成:', result)
        
        // 停止动画和计时器
        this.stopWaveformAnimation()
        this.stopRecordTimer()
        
        // 分析录音质量
        const quality = audioService.analyzeAudioQuality()
        
        this.setData({
          isRecording: false,
          hasRecording: true,
          audioPath: result.tempFilePath,
          audioQuality: quality
        })
        
        // 录音完成后，清理并重绘波形为静态状态
        setTimeout(() => {
          this.drawFinalWaveform()
        }, 100)
        
        this.saveRecordingStats(result)
        
        // 显示录音质量提示
        if (quality) {
          this.showQualityFeedback(quality)
        }
      },
      
      onFrameRecorded: (waveData) => {
        this.updateWaveform(waveData)
      },
      
      onRecordError: (error) => {
        console.error('🎤 录音错误:', error)
        this.setData({ isRecording: false })
        
        // 清理状态
        this.stopWaveformAnimation()
        this.stopRecordTimer()
        
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none',
          duration: 2000
        })
      },
      
      onPlayStart: () => {
        console.log('▶️ 开始播放录音')
        this.setData({ isPlaying: true })
      },
      
      onPlayEnd: () => {
        console.log('⏹️ 播放结束')
        this.setData({ isPlaying: false })
      },
      
      onPlayError: (error) => {
        console.error('❌ 播放失败:', error)
        this.setData({ isPlaying: false })
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      }
    })
  },

  // 初始化Canvas（按需初始化）
  initCanvas() {
    // Canvas只在录音状态下才会显示，所以不需要在页面加载时初始化
    // 改为在开始录音时按需初始化
    console.log('📝 Canvas将在录音时按需初始化')
  },

  // 设置Canvas（增强错误处理）
  setupCanvas() {
    const query = this.createSelectorQuery()
    query.select('#waveCanvas').boundingClientRect((rect) => {
      if (rect && rect.width > 0 && rect.height > 0) {
        this.setData({
          canvasWidth: rect.width,
          canvasHeight: rect.height
        })
        console.log(`✅ Canvas初始化成功: ${rect.width}x${rect.height}`)
        
        // 重置重试计数器
        this.canvasInitRetries = 0
        
        // 初始化Canvas上下文
        this.initCanvasContext()
      } else {
        console.warn('⚠️ Canvas节点获取失败，使用默认尺寸')
        
        // 使用默认尺寸
        this.setData({
          canvasWidth: 300,
          canvasHeight: 100
        })
        
        // 检查重试次数，避免无限重试
        this.canvasInitRetries = (this.canvasInitRetries || 0) + 1
        const maxRetries = 2
        
        if (this.canvasInitRetries < maxRetries) {
          console.log(`🔄 Canvas重试 ${this.canvasInitRetries}/${maxRetries}`)
          // 延迟重试
          setTimeout(() => {
            this.setupCanvas()
          }, 500 * this.canvasInitRetries) // 递增延迟时间
        } else {
          console.warn(`⚠️ Canvas初始化重试${maxRetries}次后放弃，使用默认配置`)
          // 使用默认配置，不再重试
          this.setData({
            canvasWidth: 300,
            canvasHeight: 100
          })
          this.initCanvasContext()
        }
      }
    }).exec()
  },

  // 确保Canvas已初始化（在需要时调用）
  ensureCanvasInitialized() {
    if (!this.data.canvasWidth || this.data.canvasWidth === 0) {
      console.log('🎨 按需初始化Canvas')
      this.canvasInitRetries = 0
      // 延迟一点时间确保DOM已渲染
      setTimeout(() => {
        this.setupCanvas()
      }, 100)
    }
  },

  // 初始化Canvas上下文
  initCanvasContext() {
    const query = this.createSelectorQuery()
    query.select('#waveCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0] && res[0].node) {
          this.canvasNode = res[0].node
          this.canvasContext = this.canvasNode.getContext('2d')
          console.log('✅ Canvas上下文初始化成功')
        } else {
          console.warn('⚠️ Canvas上下文获取失败，使用兼容模式')
        }
      })
  },

  // 开始录音
  startRecording() {
    console.log('🎤 startRecording 被调用', {
      recordAuth: this.data.recordAuth,
      isRecording: this.data.isRecording
    })
    
    if (!this.data.recordAuth) {
      console.log('❌ 没有录音权限，显示授权弹窗')
      this.showAuthModal()
      return
    }
    
    const success = audioService.startRecording()
    console.log('🎤 录音启动结果:', success)
    
    if (!success) {
      wx.showToast({
        title: '录音启动失败',
        icon: 'none'
      })
    }
  },

  // 停止录音
  stopRecording() {
    console.log('🎤 stopRecording 被调用', {
      isRecording: this.data.isRecording
    })
    
    if (this.data.isRecording) {
      const success = audioService.stopRecording()
      console.log('🎤 录音停止结果:', success)
    } else {
      console.log('⚠️ 当前没有录音进行中')
    }
    
    // 检查录音质量成就
    setTimeout(() => {
      this.checkTodayAchievements()
    }, 1000)
  },

  // 播放录音（真机优化版）
  async playRecording() {
    if (!this.data.hasRecording) {
      wx.showToast({
        title: '暂无录音',
        icon: 'none'
      })
      return
    }

    // 防止重复播放
    if (this.data.isPlaying) {
      console.log('⚠️ 录音正在播放中，跳过重复请求')
      return
    }

    try {
      // 设置播放状态
      this.setData({ isPlaying: true })
      console.log('▶️ 开始播放录音')
      
      await audioService.playRecording()
      
      console.log('✅ 录音播放完成')
    } catch (error) {
      console.error('❌ 播放失败:', error)
      wx.showToast({
        title: '播放失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      // 重置播放状态
      this.setData({ isPlaying: false })
    }
  },

  // 重新录音
  reRecord() {
    console.log('🔄 重新录音，清理所有状态')
    
    // 停止所有动画和计时器
    this.stopWaveformAnimation()
    this.stopRecordTimer()
    
    // 清理录音服务状态
    audioService.cleanup()
    
    // 重置所有相关状态
    this.setData({
      hasRecording: false,
      audioPath: '',
      waveData: [],
      audioQuality: null,
      isRecording: false,
      isPlaying: false,
      recordDuration: 0,
      recordDurationText: '00:00'
    })
    
    // 清空Canvas显示
    setTimeout(() => {
      this.clearCanvas()
    }, 50)
  },

  // 清空Canvas显示
  clearCanvas() {
    const { canvasWidth, canvasHeight } = this.data
    
    if (!canvasWidth || canvasWidth === 0) return
    
    this.createSelectorQuery()
      .select('#waveCanvas')
      .fields({
        node: true,
        size: true
      })
      .exec((res) => {
        if (res[0] && res[0].node) {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            const dpr = (wx.getDeviceInfo && wx.getDeviceInfo().pixelRatio) || (wx.getAppBaseInfo && wx.getAppBaseInfo().pixelRatio) || 2
            ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr)
            console.log('✅ Canvas已清空')
          }
        } else {
          // 回退到旧版API清空
          const ctx = wx.createCanvasContext('waveCanvas', this)
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)
          ctx.draw()
        }
      })
  },

  // 切换到下一个句子（增强版）
  switchSentence() {
    console.log('⏭️ 切换到下一个句子')
    
    const currentSentenceId = this.data.currentSentence ? this.data.currentSentence.id : null
    
    // 强制获取新的句子（确保不是当前句子）
    let nextSentence = null
    let attempts = 0
    const maxAttempts = 10
    
    do {
      nextSentence = this.getNextSentence()
      attempts++
      console.log(`🔍 尝试获取下一句 ${attempts}/${maxAttempts}:`, nextSentence ? nextSentence.id : 'null')
    } while (nextSentence && nextSentence.id === currentSentenceId && attempts < maxAttempts)
    
    // 如果还是同一个句子，强制从筛选后的句子中随机选择一个不同的
    if (!nextSentence || nextSentence.id === currentSentenceId) {
      const filteredSentences = this.getFilteredSentences()
      const differentSentences = filteredSentences.filter(s => s.id !== currentSentenceId)
      
      if (differentSentences.length > 0) {
        const randomIndex = Math.floor(Math.random() * differentSentences.length)
        nextSentence = differentSentences[randomIndex]
        console.log(`🎲 强制随机选择不同句子:`, nextSentence.id)
      } else if (filteredSentences.length > 0) {
        // 如果筛选后只有一个句子，就用那个句子
        nextSentence = filteredSentences[0]
        console.log(`⚠️ 筛选后只有一个句子:`, nextSentence.id)
        
        // 如果只有一个句子且就是当前句子，提示用户
        if (nextSentence.id === currentSentenceId) {
          wx.showToast({
            title: '当前筛选条件下只有这一个句子',
            icon: 'none',
            duration: 2000
          })
          return
        }
      }
    }
    
    if (nextSentence) {
      // 更新当前句子和相关状态
      const updateData = {
        currentSentence: nextSentence,
        showTranslation: false,
        hasRecording: false,
        audioPath: '',
        audioQuality: null,
        isRecording: false,
        isPlaying: false,
        recordDuration: 0,
        recordDurationText: '00:00',
        waveData: []
      }
      
      // 如果选择的是"全部"级别，显示当前句子的实际级别
      const selectedLevelOption = this.data.availableLevels[this.data.selectedLevelIndex]
      if (selectedLevelOption === '全部') {
        updateData.selectedLevel = nextSentence.level
      }
      
      this.setData(updateData)
      
      // 更新难度星星显示
      this.updateDifficultyStars()
      
      // 清空波形画布
      setTimeout(() => {
        this.clearCanvas()
      }, 50)
      
      // 清理录音服务状态
      audioService.cleanup()
      
      console.log('✅ 句子切换完成:', {
        id: nextSentence.id,
        content: nextSentence.content,
        level: nextSentence.level,
        category: nextSentence.category
      })
    } else {
      console.warn('⚠️ 没有找到下一个句子')
      wx.showToast({
        title: '没有更多句子了',
        icon: 'none'
      })
    }
  },

  // 更新难度星星显示
  updateDifficultyStars() {
    const { currentSentence } = this.data
    if (currentSentence && currentSentence.difficulty) {
      const difficultyStars = '★'.repeat(currentSentence.difficulty)
      this.setData({ difficultyStars })
    } else {
      this.setData({ difficultyStars: '★' })
    }
  },

  // 切换翻译显示
  toggleTranslation() {
    this.setData({
      showTranslation: !this.data.showTranslation
    })
  },

  // 播放文本朗读（TTS）
  async playTextToSpeech() {
    const { currentSentence, isTTSPlaying } = this.data
    
    if (!currentSentence || !currentSentence.content) {
      console.warn('⚠️ 没有可朗读的句子')
      return
    }
    
    // 如果正在播放，则停止
    if (isTTSPlaying) {
      this.stopTextToSpeech()
      return
    }
    
    try {
      console.log('🔊 开始朗读:', currentSentence.content)
      
      // 📊 添加TTS环境诊断
      console.log('🔍 开始TTS环境诊断...')
      const supportInfo = ttsService.getTTSSupportInfo()
      const isSupported = ttsService.isSupported()
      console.log('🎯 TTS支持状态:', isSupported)
      
      // 更新播放状态
      this.setData({ isTTSPlaying: true })
      
      // 调用TTS服务
      const result = await ttsService.playText(currentSentence.content, {
        rate: 0.8, // 稍慢一点，便于学习
        volume: 0.9
      })
      
      console.log('📋 TTS服务返回结果:', result)
      
      if (result.success) {
        console.log('✅ TTS播放完成')
      } else {
        console.log('ℹ️ TTS播放结果:', result.message)
        
        // 根据环境提供更具体的错误信息
        let errorMessage = result.message || 'TTS功能暂不可用'
        
        if (supportInfo.environment === 'browser') {
          errorMessage = '微信开发者工具暂不支持语音朗读，请在真机上测试'
        } else if (!supportInfo.wxCreateSynthesizeEngine && !supportInfo.speechSynthesis) {
          errorMessage = '当前设备不支持语音合成功能'
        } else {
          errorMessage = '语音朗读服务暂时不可用，请稍后重试'
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('❌ TTS播放失败:', error)
      
      // 获取支持信息用于错误诊断
      const supportInfo = ttsService.getTTSSupportInfo()
      let errorMessage = '语音朗读功能遇到问题'
      
      if (supportInfo.environment === 'browser') {
        errorMessage = '微信开发者工具不支持语音朗读，请在手机上测试'
      } else {
        errorMessage = '当前环境不支持语音播放功能'
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
    } finally {
      // 重置播放状态
      this.setData({ isTTSPlaying: false })
    }
  },

  // 停止文本朗读
  stopTextToSpeech() {
    try {
      ttsService.stopCurrent()
      this.setData({ isTTSPlaying: false })
      console.log('⏹️ TTS播放已停止')
    } catch (error) {
      console.error('❌ 停止TTS时出错:', error)
    }
  },

  // 显示TTS调试面板（长按TTS按钮触发）
  showTTSDebugPanel() {
    console.log('🔧 显示TTS调试面板')
    ttsService.showDebugPanel()
  },

  // 模拟TTS播放（用于测试）
  async mockTTSPlay() {
    const { currentSentence } = this.data
    if (!currentSentence || !currentSentence.content) {
      wx.showToast({
        title: '没有可朗读的句子',
        icon: 'none'
      })
      return
    }

    try {
      this.setData({ isTTSPlaying: true })
      await ttsService.mockTTSPlayback(currentSentence.content)
      this.setData({ isTTSPlaying: false })
    } catch (error) {
      console.error('模拟TTS播放失败:', error)
      this.setData({ isTTSPlaying: false })
    }
  },

  // 切换自动朗读功能
  toggleAutoPlay() {
    const newAutoPlayEnabled = !this.data.autoPlayEnabled
    this.setData({ autoPlayEnabled: newAutoPlayEnabled })
    
    // 保存设置到本地存储
    wx.setStorageSync('autoPlayEnabled', newAutoPlayEnabled)
    
    const message = newAutoPlayEnabled ? '已开启自动朗读' : '已关闭自动朗读'
    wx.showToast({
      title: message,
      icon: 'success',
      duration: 1500
    })
    
    console.log(`⚙️ 自动朗读功能: ${newAutoPlayEnabled ? '开启' : '关闭'}`)
  },

  // 加载TTS设置
  loadTTSSettings() {
    try {
      const autoPlayEnabled = wx.getStorageSync('autoPlayEnabled')
      if (autoPlayEnabled !== undefined && autoPlayEnabled !== null) {
        this.setData({ autoPlayEnabled })
        console.log(`📱 已加载自动朗读设置: ${autoPlayEnabled ? '开启' : '关闭'}`)
      }
    } catch (error) {
      console.warn('⚠️ 加载TTS设置失败:', error)
    }
  },

  // 加载每日目标设置
  loadDailyGoalSettings() {
    try {
      const dailyGoal = wx.getStorageSync('dailyGoal') || 20
      this.setData({ dailyGoal })
      console.log(`🎯 已加载每日目标设置: ${dailyGoal}句`)
      
      // 重新计算目标完成百分比
      this.updateGoalPercentage()
    } catch (error) {
      console.warn('⚠️ 加载每日目标设置失败:', error)
    }
  },

  // 更新每日目标（供设置页面调用）
  updateDailyGoal(newGoal) {
    console.log(`🎯 更新每日目标: ${this.data.dailyGoal} → ${newGoal}`)
    
    this.setData({ dailyGoal: newGoal })
    
    // 重新计算目标完成百分比
    this.updateGoalPercentage()
    
    console.log(`🎯 每日目标已更新为${newGoal}句`)
  },

  // 开始录音计时
  startRecordTimer() {
    this.recordTimer = setInterval(() => {
      const duration = this.data.recordDuration + 1
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      this.setData({
        recordDuration: duration,
        recordDurationText: timeText
      })
    }, 1000)
  },

  // 停止录音计时
  stopRecordTimer() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer)
      this.recordTimer = null
    }
  },

  // 更新波形显示
  updateWaveform(waveData) {
    // 直接使用音频服务处理过的高质量波形数据
    this.setData({ waveData })
    this.drawWaveform()
    
    // 录音时启动动画循环（脉冲效果）
    if (this.data.isRecording && !this.waveformAnimationId) {
      this.startWaveformAnimation()
    }
  },

  // 启动波形动画循环
  startWaveformAnimation() {
    const targetFPS = 30
    const frameInterval = 1000 / targetFPS
    
    let lastFrameTime = 0
    
    const animate = (currentTime = Date.now()) => {
      if (this.data.isRecording) {
        // 帧率控制：只在达到目标间隔时才绘制
        if (currentTime - lastFrameTime >= frameInterval) {
          this.drawWaveform()
          lastFrameTime = currentTime
        }
        
        // 使用requestAnimationFrame或setTimeout
        if (typeof requestAnimationFrame !== 'undefined') {
          this.waveformAnimationId = requestAnimationFrame(animate)
        } else {
          this.waveformAnimationId = setTimeout(() => animate(), frameInterval)
        }
      } else {
        this.stopWaveformAnimation()
      }
    }
    
    animate()
  },

  // 停止波形动画循环
  stopWaveformAnimation() {
    if (this.waveformAnimationId) {
      // 智能清理：支持requestAnimationFrame和setTimeout
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.waveformAnimationId)
      } else {
        clearTimeout(this.waveformAnimationId)
      }
      this.waveformAnimationId = null
    }
  },

  // 绘制波形
  drawWaveform() {
    const { canvasWidth, canvasHeight, waveData } = this.data
    
    if (!canvasWidth || waveData.length === 0) return
    
    // 优先使用Canvas 2D API，回退到旧版API
    this.createSelectorQuery()
      .select('#waveCanvas')
      .fields({
        node: true,
        size: true
      })
      .exec((res) => {
        if (res[0] && res[0].node) {
          // 使用新的Canvas 2D API
          this.drawWaveformNew(res[0])
        } else {
          // 回退到旧版Canvas API
          this.drawWaveformLegacy()
        }
      })
  },

  // 绘制录音完成后的最终波形（静态显示）
  drawFinalWaveform() {
    const { canvasWidth, canvasHeight, waveData } = this.data
    
    console.log('🎨 绘制最终波形', { canvasWidth, waveDataLength: waveData.length })
    
    if (!canvasWidth || waveData.length === 0) {
      console.warn('⚠️ Canvas尺寸或波形数据无效，跳过绘制')
      return
    }
    
    // 确保Canvas已初始化
    this.ensureCanvasInitialized()
    
    // 使用与实时波形相同的绘制逻辑，但不包含动画
    this.createSelectorQuery()
      .select('#waveCanvas')
      .fields({
        node: true,
        size: true
      })
      .exec((res) => {
        if (res[0] && res[0].node) {
          this.drawStaticWaveform(res[0])
        } else {
          this.drawWaveformLegacy()
        }
      })
  },

  // 绘制静态波形（录音完成后使用）
  drawStaticWaveform(canvasInfo) {
    const { canvasWidth, canvasHeight, waveData } = this.data
    
    if (!canvasInfo || !canvasInfo.node) {
      console.warn('⚠️ Canvas节点无效')
      return
    }
    
    const canvas = canvasInfo.node
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      console.warn('⚠️ Canvas context获取失败')
      return
    }
    
    // 设置画布尺寸
    const dpr = wx.getDeviceInfo?.()?.pixelRatio || 2
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    ctx.scale(dpr, dpr)
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 绘制静态波形条
    if (waveData.length > 0) {
      const barCount = Math.min(40, waveData.length)
      const barWidth = 4
      const barGap = 2
      const totalWidth = barCount * (barWidth + barGap) - barGap
      const startX = (canvasWidth - totalWidth) / 2
      const centerY = canvasHeight / 2
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * waveData.length)
        const amplitude = waveData[dataIndex] || 0
        
        const barHeight = Math.max(4, amplitude * canvasHeight * 0.8)
        const x = startX + i * (barWidth + barGap)
        const y = centerY - barHeight / 2
        
        // 使用静态颜色
        ctx.fillStyle = '#58CC02'
        
        // 绘制圆角矩形条
        ctx.beginPath()
        const radius = barWidth / 2
        this.safeDrawRoundRect(ctx, x, y, barWidth, barHeight, radius)
        ctx.fill()
      }
      
      console.log('✅ 静态波形绘制完成')
    }
  },

  // 新版Canvas 2D绘制
  drawWaveformNew(canvasInfo) {
    const { canvasWidth, canvasHeight, waveData, isRecording } = this.data
    
    // 检查canvas节点是否有效
    if (!canvasInfo || !canvasInfo.node) {
      console.warn('⚠️ Canvas节点无效，回退到旧版API')
      this.drawWaveformLegacy()
      return
    }
    
    const canvas = canvasInfo.node
    const ctx = canvas.getContext('2d')
    
    // 检查context是否有效
    if (!ctx) {
      console.warn('⚠️ Canvas context获取失败，回退到旧版API')
      this.drawWaveformLegacy()
      return
    }
    
    // 设置画布尺寸
    const dpr = wx.getDeviceInfo?.()?.pixelRatio || 2
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    ctx.scale(dpr, dpr)
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 多邻国风格的条状波形绘制
    if (waveData.length > 0) {
      const barCount = Math.min(40, waveData.length)
      const barWidth = 4
      const barGap = 2
      const totalWidth = barCount * (barWidth + barGap) - barGap
      const startX = (canvasWidth - totalWidth) / 2
      const centerY = canvasHeight / 2
      
      // 录音时的动画时间控制
      const time = isRecording ? Date.now() / 1000 : 0
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * waveData.length)
        const amplitude = waveData[dataIndex] || 0
        
        let barHeight = Math.max(4, amplitude * canvasHeight * 0.8)
        
        // 录音时添加脉冲动画效果
        if (isRecording && amplitude > 0.1) {
          const pulseOffset = Math.sin(time * 3 + i * 0.2) * 0.2
          barHeight = Math.max(4, (amplitude + pulseOffset) * canvasHeight * 0.8)
        }
        
        const x = startX + i * (barWidth + barGap)
        const y = centerY - barHeight / 2
        
        // 基于音量级别的动态颜色映射
        ctx.fillStyle = this.getVolumeBasedColor(amplitude, isRecording)
        
        // 绘制圆角矩形条
        ctx.beginPath()
        const radius = barWidth / 2
        this.safeDrawRoundRect(ctx, x, y, barWidth, barHeight, radius)
        ctx.fill()
      }
    } else {
      // 无数据时显示静态的占位条
      const barCount = 20
      const barWidth = 4
      const barGap = 2
      const totalWidth = barCount * (barWidth + barGap) - barGap
      const startX = (canvasWidth - totalWidth) / 2
      const centerY = canvasHeight / 2
      
      ctx.fillStyle = '#E5E7EB'
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = 8 + Math.random() * 12
        const x = startX + i * (barWidth + barGap)
        const y = centerY - barHeight / 2
        
        ctx.beginPath()
        const radius = barWidth / 2
        this.safeDrawRoundRect(ctx, x, y, barWidth, barHeight, radius)
        ctx.fill()
      }
    }
  },

  // 旧版Canvas API绘制（兼容性回退）
  drawWaveformLegacy() {
    const { canvasWidth, canvasHeight, waveData } = this.data
    const ctx = wx.createCanvasContext('waveCanvas', this)
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 多邻国风格的条状波形绘制
    if (waveData.length > 0) {
      const barCount = Math.min(40, waveData.length)
      const barWidth = 4
      const barGap = 2
      const totalWidth = barCount * (barWidth + barGap) - barGap
      const startX = (canvasWidth - totalWidth) / 2
      const centerY = canvasHeight / 2
      
      ctx.setFillStyle('#58CC02')
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * waveData.length)
        const amplitude = waveData[dataIndex] || 0
        const barHeight = Math.max(4, amplitude * canvasHeight * 0.8)
        
        const x = startX + i * (barWidth + barGap)
        const y = centerY - barHeight / 2
        
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    } else {
      // 无数据时显示静态的占位条
      const barCount = 20
      const barWidth = 4
      const barGap = 2
      const totalWidth = barCount * (barWidth + barGap) - barGap
      const startX = (canvasWidth - totalWidth) / 2
      const centerY = canvasHeight / 2
      
      ctx.setFillStyle('#E5E7EB')
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = 8 + Math.random() * 20
        const x = startX + i * (barWidth + barGap)
        const y = centerY - barHeight / 2
        
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }
    
    ctx.draw()
  },

  // 安全绘制圆角矩形的辅助函数
  safeDrawRoundRect(ctx, x, y, width, height, radius) {
    try {
      if (ctx.roundRect && typeof ctx.roundRect === 'function') {
        // 尝试使用新版 roundRect API
        const radiusArray = Array.isArray(radius) ? radius : [radius]
        ctx.roundRect(x, y, width, height, radiusArray)
      } else {
        // 回退到手动绘制圆角矩形
        this.drawRoundRectManually(ctx, x, y, width, height, radius)
      }
    } catch (error) {
      // 如果所有方法都失败，使用普通矩形
      console.warn('⚠️ 圆角矩形绘制失败，使用普通矩形:', error.message)
      ctx.rect(x, y, width, height)
    }
  },

  // 手动绘制圆角矩形（兼容性回退）
  drawRoundRectManually(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2)
    
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.arcTo(x + width, y, x + width, y + r, r)
    ctx.lineTo(x + width, y + height - r)
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
    ctx.lineTo(x + r, y + height)
    ctx.arcTo(x, y + height, x, y + height - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  },

  // 基于音量级别的颜色映射
  getVolumeBasedColor(amplitude, isRecording = false) {
    const volume = Math.min(1, amplitude)
    
    if (!isRecording) {
      // 非录音状态：使用统一的多邻国绿色
      return '#58CC02'
    }
    
    // 录音状态：基于音量级别的动态颜色
    if (volume < 0.15) {
      return '#D1D5DB' // 极低音量 - 浅灰色
    } else if (volume < 0.3) {
      return '#84CC16' // 低音量 - 浅绿色
    } else if (volume < 0.6) {
      return '#58CC02' // 中等音量 - 多邻国标准绿
    } else if (volume < 0.85) {
      return '#16A34A' // 较高音量 - 深绿色
    } else {
      return '#F59E0B' // 过高音量 - 橙色警告
    }
  },

  // 保存录音统计
  saveRecordingStats(recordResult) {
    const { recordDuration, currentSentence, audioQuality } = this.data
    
    console.log('💾 saveRecordingStats 开始执行:', {
      recordDuration,
      currentSentence: currentSentence ? currentSentence.id : 'null',
      audioQuality: audioQuality ? audioQuality.quality : 'null'
    })
    
    if (!currentSentence) {
      console.warn('⚠️ 当前句子为空，跳过统计保存')
      return
    }
    
    // 记录到语料库服务的练习历史（这会自动按日期分组）
    const practiceRecord = {
      sentenceId: currentSentence.id,
      category: currentSentence.category,
      difficulty: currentSentence.difficulty || 1,
      quality: audioQuality && audioQuality.quality || 60,
      duration: recordDuration
    }
    
    console.log('📝 记录练习数据到语料库服务:', practiceRecord)
    sentenceService.recordPractice(practiceRecord)
    
    // 同步练习记录到云端
    this.syncPracticeToCloud(practiceRecord)
    
    // 重新加载今日统计（这会自动计算今天的练习数量）
    this.loadTodayStats()
    
    // 更新目标完成百分比
    setTimeout(() => {
      this.updateGoalPercentage()
    }, 100)
    
    console.log('📊 练习统计已更新')
  },

  // 【安全】加载今日统计（使用安全读取）
  loadTodayStats() {
    // 从语料库服务获取今日统计（按日期区分）
    const todayStats = sentenceService.getStatistics()
    
    console.log('📊 从语料库服务获取的今日统计:', todayStats)
    
    // 设置今日统计数据（基于当天练习记录）
    const practiceStats = {
      sentenceCount: todayStats.today.practices || 0,  // 今日练习句数
      totalTime: 0, // 可以从练习历史中累计
      bestScore: 0,
      averageScore: todayStats.today.avgQuality || 0,
      practiceDate: new Date().toDateString()
    }
    
    // 从练习历史中计算今日总时长和最佳分数
    const today = new Date().toISOString().split('T')[0]
    const practiceHistory = security.secureGet('practice_history') || []
    const todayPractices = practiceHistory.filter(h => h.date === today)
    
    if (todayPractices.length > 0) {
      practiceStats.totalTime = todayPractices.reduce((sum, p) => sum + (p.duration || 0), 0)
      practiceStats.bestScore = Math.max(...todayPractices.map(p => p.quality || 0))
    }
    
    console.log('📊 计算出的今日统计数据:', practiceStats)
    
    this.setData({
      practiceStats: practiceStats,
      todayPracticeTime: practiceStats.totalTime
    })
    
    console.log('📊 今日统计已更新到页面')
  },

  // 显示权限申请弹框
  showAuthModal() {
    this.setData({ showAuthModal: true })
  },

  // 隐藏权限申请弹框
  hideAuthModal() {
    this.setData({ showAuthModal: false })
  },

  // 申请权限（增强隐私说明）
  async requestAuth() {
    try {
      // 【隐私保护】详细说明权限用途
      const modalResult = await wx.showModal({
        title: '录音权限说明',
        content: '我们需要录音权限用于英语口语练习功能。录音文件仅在您的设备本地处理，不会上传到服务器或收集您的个人信息。',
        showCancel: true,
        confirmText: '同意',
        cancelText: '取消'
      })
      
      if (!modalResult.confirm) {
        this.setData({ showAuthModal: false })
        return
      }
      
      const authResult = await app.requestRecordAuth()
      if (authResult) {
        // 更新全局和页面状态
        app.globalData.recordAuth = true
        this.setData({
          recordAuth: true,
          showAuthModal: false
        })
        
        // 权限获取成功后初始化音频服务
        this.initAudioService()
        
        wx.showToast({
          title: '权限获取成功',
          icon: 'success'
        })
        
        console.log('✅ 录音权限授权成功，音频服务已初始化')
      }
    } catch (error) {
      console.error('❌ 权限申请失败:', error)
      this.setData({ showAuthModal: false })
      
      // 显示更详细的错误信息
      wx.showModal({
        title: '权限获取失败',
        content: '无法获取录音权限，您可以稍后在设置页面手动开启',
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 显示录音质量反馈
  showQualityFeedback(quality) {
    let title = '录音质量分析'
    let content = `总评分：${quality.quality}分\n`
    
    if (quality.quality >= 80) {
      title = '🎉 录音质量优秀'
      content += '音质清晰，录音效果很好！'
    } else if (quality.quality >= 60) {
      title = '👍 录音质量良好'
      content += '录音效果不错，继续保持！'
    } else {
      title = '💡 录音质量提示'
      const tips = []
      
      if (quality.avgVolume < 20) {
        tips.push('音量偏低，请靠近话筒')
      }
      if (quality.stability < 70) {
        tips.push('音量不够稳定，保持匀速说话')
      }
      if (quality.silenceRatio > 30) {
        tips.push('静音时间较长，说话更连贯')
      }
      if (quality.clippingRatio > 5) {
        tips.push('音量过大，请降低说话音量')
      }
      
      content += tips.length > 0 ? tips.join('\n') : '继续练习会更好！'
    }
    
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 切换质量提示显示
  toggleQualityTip() {
    this.setData({
      showQualityTip: !this.data.showQualityTip
    })
  },

  // 切换推荐模式
  toggleRecommendationMode() {
    const modes = ['smart', 'category', 'random']
    const currentIndex = modes.indexOf(this.data.recommendationMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const nextMode = modes[nextIndex]

    this.setData({
      recommendationMode: nextMode,
      selectedCategory: '' // 重置分类选择
    })

    const modeNames = {
      smart: '智能推荐',
      category: '分类筛选',
      random: '随机练习'
    }

    wx.showToast({
      title: `切换到${modeNames[nextMode]}`,
      icon: 'none',
      duration: 1500
    })

    console.log(`🔄 推荐模式切换到: ${nextMode}`)
  },

  // 初始化云同步服务
  initCloudSync() {
    try {
      // 获取同步状态
      const syncStatus = cloudService.getSyncStatus()
      
      this.setData({
        syncStatus
      })
      
      // 启动时自动同步（如果启用）
      const cloudSettings = cloudService.getCloudSettings()
      if (cloudSettings.syncOnLaunch && syncStatus.isOnline) {
        // 延迟执行，避免阻塞页面初始化
        setTimeout(() => {
          this.performAutoSync().catch(error => {
            console.warn('🔄 启动时自动同步失败，这是正常现象，将在后台重试:', error.message)
          })
        }, 1000)
      }
      
      console.log('☁️ 云同步服务已初始化')
    } catch (error) {
      console.error('☁️ 云同步服务初始化失败:', error)
      // 设置默认状态
      this.setData({
        syncStatus: {
          isOnline: false,
          queueLength: 0,
          lastSyncTime: null,
          lastSyncDate: '从未同步'
        }
      })
    }
  },

  // 同步练习记录到云端
  async syncPracticeToCloud(practiceRecord) {
    try {
      await cloudService.syncPracticeRecord(practiceRecord)
      
      // 更新同步状态
      const syncStatus = cloudService.getSyncStatus()
      this.setData({ syncStatus })
      
    } catch (error) {
      console.error('练习记录云同步失败:', error)
      // 显示同步失败指示器
      this.showSyncIndicator('failed')
    }
  },

  // 执行自动同步
  async performAutoSync() {
    if (!this.data.syncStatus || !this.data.syncStatus.isOnline) {
      console.log('🔄 网络不可用，跳过自动同步')
      return
    }

    try {
      console.log('🔄 开始执行自动同步...')
      
      // 静默同步，不显示加载指示器
      await cloudService.performFullSync()
      
      // 更新同步状态
      const syncStatus = cloudService.getSyncStatus()
      this.setData({ syncStatus })
      
      console.log('✅ 自动同步完成')
      
    } catch (error) {
      // 自动同步失败时静默处理，不影响用户体验
      console.warn('🔄 自动同步失败（静默处理）:', error.message)
      
      // 仅在控制台记录错误，不显示用户提示
      // 这是正常现象，特别是在开发环境或网络不稳定时
    }
  },

  // 手动触发同步
  async manualSync() {
    const result = await cloudService.manualSync()
    
    if (result.success) {
      // 更新同步状态
      const syncStatus = cloudService.getSyncStatus()
      this.setData({ syncStatus })
      
      // 重新加载语料库服务数据（如果有云端更新）
      sentenceService.loadPracticeHistory()
    }
  },

  // 显示同步指示器
  showSyncIndicator(type) {
    const indicators = {
      syncing: { icon: '🔄', text: '数据同步中...', color: '#2196F3' },
      success: { icon: '✅', text: '同步完成', color: '#4CAF50' },
      failed: { icon: '⚠️', text: '同步失败，稍后重试', color: '#FF9800' }
    }
    
    const indicator = indicators[type]
    if (!indicator) return
    
    // 避免重复显示相同类型的指示器
    if (this.data.showSyncIndicator && 
        this.data.syncIndicator && 
        this.data.syncIndicator.text === indicator.text) {
      return
    }
    
    this.setData({
      showSyncIndicator: true,
      syncIndicator: indicator
    })
    
    // 清除之前的定时器
    if (this.syncIndicatorTimer) {
      clearTimeout(this.syncIndicatorTimer)
    }
    
    // 根据类型设置不同的显示时长
    const duration = type === 'syncing' ? 5000 : 3000
    this.syncIndicatorTimer = setTimeout(() => {
      this.setData({ showSyncIndicator: false })
    }, duration)
  },

  // 页面销毁时清理
  onUnload() {
    // 清理定时器
    if (this.recordTimer) {
      clearInterval(this.recordTimer)
    }
    
    // 清理同步指示器定时器
    if (this.syncIndicatorTimer) {
      clearTimeout(this.syncIndicatorTimer)
    }
    
    // 清理波形动画定时器
    this.stopWaveformAnimation()
    
    // 清理录音服务
    audioService.cleanup()
    
    // 清理TTS服务资源
    if (ttsService && ttsService.destroy) {
      ttsService.destroy()
    }
    
    // 【安全】清理临时文件（24小时后）
    const tempFiles = wx.getStorageSync('temp_audio_files') || []
    const now = Date.now()
    const validFiles = tempFiles.filter(file => 
      now - file.timestamp < 24 * 60 * 60 * 1000 // 24小时
    )
    wx.setStorageSync('temp_audio_files', validFiles)
  },

  // 初始化游戏化数据
  initGameData: function() {
    try {
      // 获取练习连击数据
      const streakData = wx.getStorageSync('practiceStreak') || {
        count: 0,
        lastDate: null
      };
      
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      // 检查连击是否中断
      if (streakData.lastDate === yesterday || streakData.lastDate === today) {
        this.setData({ practiceStreak: streakData.count });
      } else {
        this.setData({ practiceStreak: 0 });
      }
      
      // 计算目标完成百分比
      this.updateGoalPercentage();
      
      // 检查今日成就
      this.checkTodayAchievements();
      
    } catch (e) {
      console.error('初始化游戏化数据失败:', e);
    }
  },

  // 更新目标完成百分比
  updateGoalPercentage: function() {
    const { sentenceCount } = this.data.practiceStats || { sentenceCount: 0 };
    const { dailyGoal } = this.data;
    const percentage = Math.min(Math.round((sentenceCount / dailyGoal) * 100), 100);
    
    console.log('🎯 updateGoalPercentage 计算:', {
      practiceStats: this.data.practiceStats,
      sentenceCount: sentenceCount,
      dailyGoal: dailyGoal,
      percentage: percentage
    });
    
    this.setData({ 
      goalPercentage: percentage 
    });
    
    console.log('🎯 目标百分比已更新:', percentage + '%');
  },

  // 检查今日成就
  checkTodayAchievements: function() {
    const { practiceStats, practiceStreak } = this.data;
    const achievements = [];
    
    // 检查各种成就条件
    if (practiceStats.sentenceCount >= 10 && practiceStats.sentenceCount % 10 === 0) {
      achievements.push({ id: 'sentences_10', icon: '🎯' });
    }
    
    if (practiceStreak >= 7) {
      achievements.push({ id: 'streak_7', icon: '🔥' });
    }
    
    if (practiceStats.bestScore >= 90) {
      achievements.push({ id: 'quality_master', icon: '🎵' });
    }
    
    if (practiceStats.totalTime >= 30) {
      achievements.push({ id: 'time_master', icon: '⭐' });
    }
    
    this.setData({ todayAchievements: achievements });
  },

  // 跳转到历史页面
  goToHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 跳转到语料库页面
  goToLibrary() {
    wx.switchTab({
      url: '/pages/library/library'
    })
  },

  // 跳转到设置页面
  goToSettings() {
    wx.switchTab({
      url: '/pages/settings/settings'
    })
  },

  // 多邻国风格录音区域点击处理
  toggleRecordArea() {
    console.log('🎤 录音区域被点击', {
      isRecording: this.data.isRecording,
      hasRecording: this.data.hasRecording,
      recordAuth: this.data.recordAuth
    });

    // 如果正在录音，停止录音
    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }

    // 如果没有录音权限，请求权限
    if (!this.data.recordAuth) {
      console.log('❌ 没有录音权限，显示授权弹窗');
      this.showAuthModal();
      return;
    }

    // 如果已有录音，重新开始录音
    if (this.data.hasRecording) {
      // 清理之前的录音
      this.reRecord();
    }

    // 开始录音
    setTimeout(() => {
      this.startRecording();
    }, 100); // 稍微延迟以确保状态清理完成
  },

  // 级别选择事件
  onLevelChange(e) {
    const selectedLevelIndex = parseInt(e.detail.value)
    const selectedLevelOption = this.data.availableLevels[selectedLevelIndex]
    
    console.log(`🔄 级别切换开始: ${selectedLevelOption}`)
    
    // 更新级别选择状态
    this.setData({
      selectedLevelIndex
    })
    
    // 如果选择"全部"，清空分类筛选
    if (selectedLevelOption === '全部') {
      this.setData({
        selectedCategory: '',
        selectedCategoryIndex: 0,
        selectedCategoryDisplay: '全部'
      })
    }
    
    // 强制获取新的句子（确保不是当前句子）
    let nextSentence = null
    let attempts = 0
    const maxAttempts = 10
    const currentSentenceId = this.data.currentSentence ? this.data.currentSentence.id : null
    
    do {
      nextSentence = this.getNextSentence()
      attempts++
      console.log(`🔍 尝试获取新句子 ${attempts}/${maxAttempts}:`, nextSentence ? nextSentence.id : 'null')
    } while (nextSentence && nextSentence.id === currentSentenceId && attempts < maxAttempts)
    
    // 如果还是同一个句子，强制从筛选后的句子中随机选择一个不同的
    if (!nextSentence || nextSentence.id === currentSentenceId) {
      const filteredSentences = this.getFilteredSentences()
      const differentSentences = filteredSentences.filter(s => s.id !== currentSentenceId)
      
      if (differentSentences.length > 0) {
        const randomIndex = Math.floor(Math.random() * differentSentences.length)
        nextSentence = differentSentences[randomIndex]
        console.log(`🎲 强制随机选择不同句子:`, nextSentence.id)
      } else if (filteredSentences.length > 0) {
        // 如果筛选后只有一个句子，就用那个句子
        nextSentence = filteredSentences[0]
        console.log(`⚠️ 筛选后只有一个句子:`, nextSentence.id)
      }
    }
    
    if (nextSentence) {
      const updateData = {
        currentSentence: nextSentence,
        showTranslation: false,
        hasRecording: false,
        audioPath: '',
        audioQuality: null,
        isRecording: false,
        isPlaying: false,
        recordDuration: 0,
        recordDurationText: '00:00',
        waveData: [],
        // 显示当前句子的实际级别（如果选择的是全部）或选择的级别
        selectedLevel: selectedLevelOption === '全部' ? nextSentence.level : selectedLevelOption
      }
      
      this.setData(updateData)
      
      // 更新难度星星显示
      this.updateDifficultyStars()
      
      // 清空波形画布
      setTimeout(() => {
        this.clearCanvas()
      }, 50)
      
      // 清理录音服务状态
      audioService.cleanup()
    }
    
    // 更新总句数（基于筛选结果）
    const filteredSentences = this.getFilteredSentences()
    this.setData({
      totalSentences: filteredSentences.length
    })
    
    console.log(`✅ 级别切换完成: ${selectedLevelOption}，当前显示: ${this.data.selectedLevel}，可用句子: ${filteredSentences.length} 句`)
    
    // 显示提示
    wx.showToast({
      title: `切换到${selectedLevelOption}`,
      icon: 'none',
      duration: 1500
    })
  },

  // 分类选择事件（picker版本）
  onCategoryPickerChange(e) {
    const selectedCategoryIndex = parseInt(e.detail.value)
    const selectedCategoryDisplay = this.data.categoryOptions[selectedCategoryIndex]
    const selectedCategory = selectedCategoryDisplay === '全部' ? '' : selectedCategoryDisplay
    
    this.setData({
      selectedCategory,
      selectedCategoryDisplay,
      selectedCategoryIndex
    })
    
    // 获取新的句子
    const nextSentence = this.getNextSentence()
    if (nextSentence) {
      this.setData({
        currentSentence: nextSentence,
        showTranslation: false,
        hasRecording: false,
        audioQuality: null
      })
      
      // 更新难度星星显示
      this.updateDifficultyStars()
    }
    
    // 更新总句数（基于筛选结果）
    const filteredSentences = this.getFilteredSentences()
    this.setData({
      totalSentences: filteredSentences.length
    })
    
    console.log(`📂 分类切换到: ${selectedCategoryDisplay}，可用句子: ${filteredSentences.length} 句`)
    
    // 显示提示
    wx.showToast({
      title: `切换到${selectedCategoryDisplay}`,
      icon: 'none',
      duration: 1500
    })
  },

  // 获取下一个推荐句子
  getNextSentence() {
    const { recommendationMode, selectedCategory, selectedLevel, currentSentence } = this.data
    let nextSentence = null
    const currentSentenceId = currentSentence ? currentSentence.id : null

    // 首先根据级别和分类筛选句子
    let filteredSentences = this.getFilteredSentences()

    switch (recommendationMode) {
      case 'smart':
        // 智能推荐（考虑用户水平、练习历史等，排除当前句子）
        let attempts = 0
        do {
          const smartSentences = filteredSentences.filter(s => s.id !== currentSentenceId)
          if (smartSentences.length > 0) {
            // 使用智能推荐算法从筛选后的句子中选择
            nextSentence = this.getSmartRecommendation(smartSentences)
          }
          attempts++
        } while (nextSentence && nextSentence.id === currentSentenceId && attempts < 5)
        break
        
      case 'category':
        // 按分类筛选，排除当前句子
        const categorySentences = filteredSentences.filter(s => s.id !== currentSentenceId)
        if (categorySentences.length > 0) {
          const randomIndex = Math.floor(Math.random() * categorySentences.length)
          nextSentence = categorySentences[randomIndex]
        }
        break
        
      case 'sequential':
        // 顺序练习
        const currentIndex = this.data.currentIndex
        const nextIndex = (currentIndex + 1) % filteredSentences.length
        nextSentence = filteredSentences[nextIndex]
        this.setData({ currentIndex: nextIndex })
        break
        
      default:
        // 随机选择（排除当前句子）
        const randomSentences = filteredSentences.filter(s => s.id !== currentSentenceId)
        if (randomSentences.length > 0) {
          const randomIndex = Math.floor(Math.random() * randomSentences.length)
          nextSentence = randomSentences[randomIndex]
        }
    }

    // 如果没有找到合适的句子，fallback到第一个不同的句子
    if (!nextSentence || nextSentence.id === currentSentenceId) {
      const fallbackSentences = filteredSentences.filter(s => s.id !== currentSentenceId)
      nextSentence = fallbackSentences[0] || filteredSentences[0] || sentenceService.sentences[0]
    }

    return nextSentence
  },

  // 根据级别和分类筛选句子
  getFilteredSentences() {
    const { selectedLevelIndex, selectedCategory, availableLevels } = this.data
    let sentences = [...sentenceService.sentences]

    // 级别筛选（当选择的不是"全部"时才筛选）
    if (selectedLevelIndex > 0 && availableLevels[selectedLevelIndex] !== '全部') {
      const selectedLevel = availableLevels[selectedLevelIndex]
      sentences = sentences.filter(s => s.level === selectedLevel)
    }

    // 分类筛选
    if (selectedCategory && selectedCategory !== '全部') {
      sentences = sentences.filter(s => s.category === selectedCategory)
    }

    return sentences
  },

  // 智能推荐算法（简化版）
  getSmartRecommendation(sentences) {
    if (sentences.length === 0) return null
    
    // 获取练习历史
    const practiceHistory = security.secureGet('practice_history') || []
    
    // 为每个句子计算推荐分数
    const scoredSentences = sentences.map(sentence => {
      let score = 0
      
      // 未练习过的句子优先
      const practiced = practiceHistory.some(h => h.sentenceId === sentence.id)
      if (!practiced) score += 50
      
      // 难度适配（根据用户水平）
      const userLevel = this.getUserLevel()
      const difficultyDiff = Math.abs((sentence.difficulty || 1) - userLevel)
      score += Math.max(0, 20 - difficultyDiff * 5)
      
      // 随机因子，增加多样性
      score += Math.random() * 30
      
      return { sentence, score }
    })
    
    // 排序并从前30%中随机选择
    scoredSentences.sort((a, b) => b.score - a.score)
    const topCount = Math.max(1, Math.ceil(scoredSentences.length * 0.3))
    const topSentences = scoredSentences.slice(0, topCount)
    
    const randomIndex = Math.floor(Math.random() * topSentences.length)
    return topSentences[randomIndex].sentence
  },

  // 获取用户水平（简化版）
  getUserLevel() {
    const practiceHistory = security.secureGet('practice_history') || []
    if (practiceHistory.length === 0) return 1
    
    const avgQuality = practiceHistory.reduce((sum, h) => sum + (h.quality || 0), 0) / practiceHistory.length
    if (avgQuality >= 80) return 2.5 // 接近高级
    if (avgQuality >= 60) return 2.0 // 中级
    return 1.5 // 初级+
  },

  // 初始化语料库系统
  async initSentenceSystem() {
    try {
      console.log('🚀 初始化语料库系统...')
      
      // 等待语料库服务初始化完成
      if (sentenceService.sentences.length === 0) {
        await sentenceService.initService()
      }
      
      // 获取可用分类
      const categories = sentenceService.getAllCategories()
      const categoryOptions = ['全部', ...categories]
      
      // 获取推荐句子
      const recommendedSentence = sentenceService.getRecommendedSentence()
      
      // 更新页面数据
      this.setData({
        currentSentence: recommendedSentence,
        totalSentences: sentenceService.getTotalCount(),
        availableCategories: categories,
        categoryOptions: categoryOptions,
        // 当选择全部级别时，显示当前句子的实际级别
        selectedLevel: recommendedSentence ? recommendedSentence.level : '初级'
      })
      
      // 更新难度星星显示
      this.updateDifficultyStars()
      
      console.log('✅ 语料库系统初始化完成')
      console.log(`📊 语料库统计: ${sentenceService.getTotalCount()} 句，${categories.length} 个分类`)
      
    } catch (error) {
      console.error('❌ 语料库系统初始化失败:', error)
      
      // 使用备用句子
      this.setData({
        currentSentence: {
          id: 'fallback_001',
          content: 'Hello, how are you?',
          translation: '你好，你好吗？',
          level: '初级',
          category: '问候',
          difficulty: 1
        },
        totalSentences: 1,
        availableCategories: ['问候'],
        categoryOptions: ['全部', '问候'],
        selectedLevel: '初级'
      })
      
      // 更新难度星星显示
      this.updateDifficultyStars()
      
      wx.showToast({
        title: '语料库加载失败，使用备用内容',
        icon: 'none',
        duration: 3000
      })
    }
  },
}) 