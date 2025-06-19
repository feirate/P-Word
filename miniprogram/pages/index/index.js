const app = getApp()

Page({
  data: {
    // 基础数据
    currentDate: '',
    todayPracticeTime: 0,
    
    // 句子相关
    currentSentence: {
      id: 'sentence_001',
      content: 'Hello, how are you today?',
      translation: '你好，你今天怎么样？',
      level: '初级',
      category: '日常对话'
    },
    currentIndex: 0,
    totalSentences: 50,
    showTranslation: false,
    
    // 录音相关
    isRecording: false,
    hasRecording: false,
    recordAuth: false,
    recordDuration: 0,
    recordDurationText: '00:00',
    audioPath: '',
    
    // 波形相关
    canvasWidth: 0,
    canvasHeight: 60,
    waveData: [],
    
    // 练习统计
    practiceStats: {
      sentenceCount: 0,
      totalTime: 0,
      bestScore: null
    },
    
    // UI状态
    showAuthModal: false
  },

  onLoad() {
    console.log('📱 练习页面加载')
    
    // 初始化页面数据
    this.initPageData()
    
    // 检查录音权限
    this.checkRecordAuth()
    
    // 初始化录音管理器
    this.initRecorder()
    
    // 初始化Canvas
    this.initCanvas()
    
    // 加载当前句子
    this.loadCurrentSentence()
    
    // 加载今日统计
    this.loadTodayStats()
  },

  onShow() {
    // 页面显示时更新数据
    this.loadTodayStats()
  },

  // 初始化页面数据
  initPageData() {
    const now = new Date()
    const currentDate = `${now.getMonth() + 1}.${String(now.getDate()).padStart(2, '0')}`
    
    this.setData({
      currentDate: currentDate
    })
    
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          canvasWidth: res.windowWidth - 48 // 减去padding
        })
      }
    })
  },

  // 检查录音权限
  checkRecordAuth() {
    const recordAuth = app.globalData.recordAuth
    this.setData({ recordAuth })
    
    if (!recordAuth) {
      console.log('⚠️ 录音权限未授权')
    }
  },

  // 初始化录音管理器
  initRecorder() {
    this.recorderManager = wx.getRecorderManager()
    
    // 录音开始
    this.recorderManager.onStart(() => {
      console.log('🎙️ 开始录音')
      this.setData({ 
        isRecording: true,
        recordDuration: 0
      })
      this.startTimer()
    })
    
    // 录音结束
    this.recorderManager.onStop((res) => {
      console.log('⏹️ 录音结束', res)
      this.setData({
        isRecording: false,
        hasRecording: true,
        audioPath: res.tempFilePath
      })
      this.stopTimer()
      this.savePracticeRecord()
    })
    
    // 录音帧数据
    this.recorderManager.onFrameRecorded((res) => {
      this.updateWaveform(res.frameBuffer)
    })
    
    // 录音错误
    this.recorderManager.onError((res) => {
      console.error('❌ 录音错误', res)
      wx.showToast({
        title: '录音失败',
        icon: 'error'
      })
      this.setData({ isRecording: false })
    })
  },

  // 初始化Canvas
  initCanvas() {
    this.canvasContext = wx.createCanvasContext('waveCanvas', this)
    this.drawEmptyWave()
  },

  // 绘制空波形
  drawEmptyWave() {
    const ctx = this.canvasContext
    const { canvasWidth, canvasHeight } = this.data
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.setStrokeStyle('#E8E8E8')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(0, canvasHeight / 2)
    ctx.lineTo(canvasWidth, canvasHeight / 2)
    ctx.stroke()
    ctx.draw()
  },

  // 更新波形显示
  updateWaveform(frameBuffer) {
    // 简化的波形绘制
    const ctx = this.canvasContext
    const { canvasWidth, canvasHeight } = this.data
    
    // 将音频数据转换为可视化数据
    const dataArray = new Uint8Array(frameBuffer)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedValue = (average / 255) * (canvasHeight / 2)
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 绘制波形
    ctx.setStrokeStyle('#4A90E2')
    ctx.setLineWidth(3)
    ctx.beginPath()
    
    const centerY = canvasHeight / 2
    const waveHeight = Math.max(5, normalizedValue)
    
    for (let i = 0; i < canvasWidth; i += 4) {
      const y = centerY + (Math.random() - 0.5) * waveHeight * 2
      if (i === 0) {
        ctx.moveTo(i, y)
      } else {
        ctx.lineTo(i, y)
      }
    }
    
    ctx.stroke()
    ctx.draw()
  },

  // 开始录音
  startRecording() {
    if (!this.data.recordAuth) {
      this.showAuthModal()
      return
    }

    console.log('🎙️ 开始录音')
    this.recorderManager.start({
      format: 'mp3',
      frameSize: 1024,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000
    })
  },

  // 停止录音
  stopRecording() {
    if (this.data.isRecording) {
      console.log('⏹️ 停止录音')
      this.recorderManager.stop()
    }
  },

  // 播放录音
  playRecording() {
    if (!this.data.hasRecording) return
    
    const audioContext = wx.createInnerAudioContext()
    audioContext.src = this.data.audioPath
    
    audioContext.onPlay(() => {
      console.log('▶️ 开始播放')
    })
    
    audioContext.onEnded(() => {
      console.log('⏹️ 播放结束')
      audioContext.destroy()
    })
    
    audioContext.onError((res) => {
      console.error('❌ 播放错误', res)
      audioContext.destroy()
    })
    
    audioContext.play()
  },

  // 重新录音
  resetRecording() {
    this.setData({
      hasRecording: false,
      recordDuration: 0,
      recordDurationText: '00:00',
      audioPath: ''
    })
    this.drawEmptyWave()
  },

  // 下一句
  nextSentence() {
    const nextIndex = (this.data.currentIndex + 1) % this.data.totalSentences
    this.setData({
      currentIndex: nextIndex,
      showTranslation: false
    })
    
    this.loadCurrentSentence()
    this.resetRecording()
  },

  // 切换翻译显示
  toggleTranslation() {
    this.setData({
      showTranslation: !this.data.showTranslation
    })
  },

  // 显示权限申请弹框
  showAuthModal() {
    this.setData({ showAuthModal: true })
  },

  // 隐藏权限申请弹框
  hideAuthModal() {
    this.setData({ showAuthModal: false })
  },

  // 申请权限
  async requestAuth() {
    try {
      await app.requestRecordAuth()
      this.setData({
        recordAuth: true,
        showAuthModal: false
      })
      wx.showToast({
        title: '权限获取成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('权限申请失败', error)
    }
  },

  // 开始计时器
  startTimer() {
    this.timer = setInterval(() => {
      const duration = this.data.recordDuration + 1
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      
      this.setData({
        recordDuration: duration,
        recordDurationText: timeText
      })
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 加载当前句子
  loadCurrentSentence() {
    // 这里应该从语料库加载句子
    // 暂时使用模拟数据
    const sentences = [
      {
        id: 'sentence_001',
        content: 'Hello, how are you today?',
        translation: '你好，你今天怎么样？',
        level: '初级',
        category: '日常对话'
      },
      {
        id: 'sentence_002',
        content: 'I would like to book a table for two.',
        translation: '我想预订一张两人桌。',
        level: '中级',
        category: '餐厅对话'
      },
      {
        id: 'sentence_003',
        content: 'Could you please help me with this problem?',
        translation: '你能帮我解决这个问题吗？',
        level: '中级',
        category: '求助对话'
      }
    ]
    
    const currentSentence = sentences[this.data.currentIndex % sentences.length]
    this.setData({ currentSentence })
  },

  // 加载今日统计
  loadTodayStats() {
    // 从本地存储加载今日练习统计
    const today = new Date().toDateString()
    const todayStats = wx.getStorageSync(`stats_${today}`) || {
      sentenceCount: 0,
      totalTime: 0,
      bestScore: null
    }
    
    this.setData({
      practiceStats: todayStats,
      todayPracticeTime: Math.floor(todayStats.totalTime / 60)
    })
  },

  // 保存练习记录
  savePracticeRecord() {
    const today = new Date().toDateString()
    const currentStats = wx.getStorageSync(`stats_${today}`) || {
      sentenceCount: 0,
      totalTime: 0,
      bestScore: null
    }
    
    // 更新统计
    currentStats.sentenceCount += 1
    currentStats.totalTime += this.data.recordDuration
    
    // 保存到本地
    wx.setStorageSync(`stats_${today}`, currentStats)
    
    // 更新页面数据
    this.loadTodayStats()
    
    console.log('💾 练习记录已保存', currentStats)
  },

  // 跳转到设置页
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  onUnload() {
    // 页面卸载时清理计时器
    this.stopTimer()
  }
}) 