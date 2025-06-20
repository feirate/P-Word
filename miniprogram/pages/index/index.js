const app = getApp()
// 引入安全服务模块
const security = require('../../services/security.js')
// 引入高质量录音服务模块
const audioService = require('../../services/audioService.js')
// 引入智能语料库服务模块
const sentenceService = require('../../services/sentenceService.js')

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
    showAuthModal: false
  },

  onLoad() {
    console.log('📱 练习页面加载')
    
    // 【安全】清理过期数据
    security.cleanExpiredData()
    
    // 初始化页面数据
    this.initPageData()
    
    // 检查录音权限
    this.checkRecordAuth()
    
    // 初始化高质量录音服务
    this.initAudioService()
    
    // 初始化Canvas
    this.initCanvas()
    
    // 初始化语料库系统
    this.initSentenceSystem()
    
    // 加载今日统计（使用安全存储）
    this.loadTodayStats()
  },

  onShow() {
    // 页面显示时更新数据
    this.loadTodayStats()
  },

  // 初始化页面数据
  initPageData() {
    const date = new Date()
    const currentDate = `${date.getMonth() + 1}.${date.getDate()}`
    this.setData({ currentDate })
  },

  // 检查录音权限
  checkRecordAuth() {
    const recordAuth = app.globalData.recordAuth
    this.setData({ recordAuth })
    
    if (!recordAuth) {
      console.log('⚠️ 录音权限未授权')
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
        this.startRecordTimer()
      },
      
      onRecordStop: (result) => {
        console.log('🎤 录音完成:', result)
        
        // 分析录音质量
        const quality = audioService.analyzeAudioQuality()
        
        this.setData({
          isRecording: false,
          hasRecording: true,
          audioPath: result.tempFilePath,
          audioQuality: quality
        })
        
        this.stopRecordTimer()
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
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none',
          duration: 2000
        })
      },
      
      onPlayStart: () => {
        console.log('▶️ 开始播放录音')
        // 可以添加播放状态UI
      },
      
      onPlayEnd: () => {
        console.log('⏹️ 播放结束')
        // 可以添加播放结束UI
      },
      
      onPlayError: (error) => {
        console.error('❌ 播放失败:', error)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      }
    })
  },

  // 初始化Canvas
  initCanvas() {
    const query = this.createSelectorQuery()
    query.select('#waveCanvas').boundingClientRect((rect) => {
      if (rect) {
        this.setData({
          canvasWidth: rect.width,
          canvasHeight: rect.height
        })
      }
    }).exec()
  },

  // 开始录音
  startRecording() {
    if (!this.data.recordAuth) {
      this.showAuthModal()
      return
    }
    
    const success = audioService.startRecording()
    if (!success) {
      wx.showToast({
        title: '录音启动失败',
        icon: 'none'
      })
    }
  },

  // 停止录音
  stopRecording() {
    if (this.data.isRecording) {
      audioService.stopRecording()
    }
  },

  // 播放录音
  async playRecording() {
    if (!this.data.hasRecording) {
      wx.showToast({
        title: '暂无录音',
        icon: 'none'
      })
      return
    }
    
    try {
      await audioService.playRecording()
    } catch (error) {
      console.error('播放失败:', error)
    }
  },

  // 重新录音
  reRecord() {
    // 清理录音服务状态
    audioService.cleanup()
    
    this.setData({
      hasRecording: false,
      audioPath: '',
      waveData: [],
      audioQuality: null
    })
  },

  // 切换句子
  switchSentence() {
    const nextSentence = this.getNextSentence()
    
    if (nextSentence) {
      this.setData({
        currentSentence: nextSentence,
        showTranslation: false
      })
      
      console.log(`🔄 切换到句子: [${nextSentence.level}] ${nextSentence.content}`)
    }
    
    // 清除当前录音
    this.setData({
      hasRecording: false,
      audioPath: '',
      waveData: [],
      audioQuality: null
    })
  },

  // 切换翻译显示
  toggleTranslation() {
    this.setData({
      showTranslation: !this.data.showTranslation
    })
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
    }
  },

  // 更新波形显示（优化版）
  updateWaveform(waveData) {
    // 直接使用音频服务处理过的高质量波形数据
    this.setData({ waveData })
    this.drawWaveform()
  },

  // 绘制波形（增强版）
  drawWaveform() {
    const { canvasWidth, canvasHeight, waveData } = this.data
    
    if (!canvasWidth || waveData.length === 0) return
    
    const ctx = wx.createCanvasContext('waveCanvas', this)
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 绘制背景网格
    ctx.setStrokeStyle('rgba(74, 144, 226, 0.1)')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 4; i++) {
      const y = (canvasHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }
    
    // 设置波形样式
    ctx.setStrokeStyle('#4A90E2')
    ctx.setFillStyle('rgba(74, 144, 226, 0.3)')
    ctx.setLineWidth(2)
    ctx.setLineCap('round')
    
    // 绘制波形区域
    const barWidth = canvasWidth / Math.max(waveData.length, 1)
    const centerY = canvasHeight / 2
    
    if (waveData.length > 0) {
      // 绘制填充区域
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      
      waveData.forEach((amplitude, index) => {
        const x = index * barWidth
        const height = amplitude * (canvasHeight * 0.7)
        ctx.lineTo(x, centerY - height / 2)
      })
      
      waveData.slice().reverse().forEach((amplitude, index) => {
        const x = (waveData.length - 1 - index) * barWidth
        const height = amplitude * (canvasHeight * 0.7)
        ctx.lineTo(x, centerY + height / 2)
      })
      
      ctx.closePath()
      ctx.fill()
      
      // 绘制波形线条
      ctx.beginPath()
      waveData.forEach((amplitude, index) => {
        const x = index * barWidth
        const height = amplitude * (canvasHeight * 0.7)
        
        if (index === 0) {
          ctx.moveTo(x, centerY - height / 2)
        } else {
          ctx.lineTo(x, centerY - height / 2)
        }
      })
      ctx.stroke()
    }
    
    ctx.draw()
  },

  // 初始化语料库系统
  async initSentenceSystem() {
    try {
      console.log('🚀 初始化语料库系统...')
      
      // 等待语料库加载完成
      await sentenceService.initService()
      
      // 获取可用分类
      const categories = sentenceService.getAllCategories()
      
      // 获取推荐句子
      const recommendedSentence = sentenceService.getRecommendedSentence()
      
      // 更新页面数据
      this.setData({
        currentSentence: recommendedSentence,
        totalSentences: sentenceService.getTotalCount(),
        availableCategories: categories
      })
      
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
        availableCategories: ['问候']
      })
    }
  },

  // 获取下一个推荐句子
  getNextSentence() {
    const { recommendationMode, selectedCategory } = this.data
    let nextSentence = null

    switch (recommendationMode) {
      case 'smart':
        // 智能推荐（考虑用户水平、练习历史等）
        nextSentence = sentenceService.getRecommendedSentence({
          excludeCompleted: true,
          smartRecommend: true
        })
        break
        
      case 'category':
        // 按分类筛选
        if (selectedCategory) {
          const categorySentences = sentenceService.getSentencesByCategory(selectedCategory)
          if (categorySentences.length > 0) {
            const randomIndex = Math.floor(Math.random() * categorySentences.length)
            nextSentence = categorySentences[randomIndex]
          }
        }
        break
        
      case 'sequential':
        // 顺序练习
        const currentIndex = this.data.currentIndex
        const totalSentences = sentenceService.getTotalCount()
        const nextIndex = (currentIndex + 1) % totalSentences
        nextSentence = sentenceService.sentences[nextIndex]
        this.setData({ currentIndex: nextIndex })
        break
        
      default:
        // 随机选择
        nextSentence = sentenceService.getRecommendedSentence({
          excludeCompleted: false,
          smartRecommend: false
        })
    }

    return nextSentence || sentenceService.getCurrentSentence()
  },

  // 【安全】保存录音统计（使用加密存储）
  saveRecordingStats(recordResult) {
    const { recordDuration, currentSentence, audioQuality } = this.data
    
    if (!currentSentence) {
      console.warn('⚠️ 当前句子为空，跳过统计保存')
      return
    }
    
    // 获取当前统计
    const currentStats = security.secureGet('practice_stats') || {
      sentenceCount: 0,
      totalTime: 0,
      bestScore: null,
      lastPracticeDate: null
    }
    
    // 更新统计数据
    const updatedStats = {
      ...currentStats,
      sentenceCount: currentStats.sentenceCount + 1,
      totalTime: currentStats.totalTime + recordDuration,
      bestScore: Math.max(currentStats.bestScore || 0, audioQuality?.quality || 0),
      lastPracticeDate: new Date().toISOString(),
      // 【隐私保护】不保存具体录音内容，仅保存统计信息
      version: '1.0',
      timestamp: Date.now()
    }
    
    // 【安全】使用加密存储
    security.secureStorage('practice_stats', updatedStats)
    
    // 记录到语料库服务的练习历史
    sentenceService.recordPractice({
      sentenceId: currentSentence.id,
      category: currentSentence.category,
      difficulty: currentSentence.difficulty || 1,
      quality: audioQuality?.quality || 60,
      duration: recordDuration
    })
    
    // 更新页面显示
    this.setData({
      practiceStats: updatedStats,
      todayPracticeTime: updatedStats.totalTime
    })
    
    console.log('📊 练习统计已保存（加密）')
    console.log('📝 练习历史已记录到语料库服务')
  },

  // 【安全】加载今日统计（使用安全读取）
  loadTodayStats() {
    const stats = security.secureGet('practice_stats')
    
    if (stats && security.checkDataIntegrity(stats)) {
      this.setData({
        practiceStats: stats,
        todayPracticeTime: stats.totalTime || 0
      })
      console.log('📊 练习统计已加载（解密）')
    } else {
      console.log('📊 无有效统计数据')
    }
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
      await wx.showModal({
        title: '录音权限说明',
        content: '我们需要录音权限用于英语口语练习功能。录音文件仅在您的设备本地处理，不会上传到服务器或收集您的个人信息。',
        showCancel: true,
        confirmText: '同意并开启',
        cancelText: '暂不开启'
      }).then((res) => {
        if (!res.confirm) {
          throw new Error('用户拒绝权限申请')
        }
      })
      
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
      this.setData({ showAuthModal: false })
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

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category || ''
    
    this.setData({
      selectedCategory: category
    })

    // 根据选择的分类获取新句子
    if (this.data.recommendationMode === 'category') {
      const nextSentence = this.getNextSentence()
      if (nextSentence) {
        this.setData({
          currentSentence: nextSentence,
          showTranslation: false
        })
      }
    }

    const categoryName = category || '全部分类'
    console.log(`📂 选择分类: ${categoryName}`)
  },

  // 页面销毁时清理
  onUnload() {
    // 清理定时器
    if (this.recordTimer) {
      clearInterval(this.recordTimer)
    }
    
    // 清理录音服务
    audioService.cleanup()
    
    // 【安全】清理临时文件（24小时后）
    const tempFiles = wx.getStorageSync('temp_audio_files') || []
    const now = Date.now()
    const validFiles = tempFiles.filter(file => 
      now - file.timestamp < 24 * 60 * 60 * 1000 // 24小时
    )
    wx.setStorageSync('temp_audio_files', validFiles)
  }
}) 