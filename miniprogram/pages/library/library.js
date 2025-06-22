//library.js
const sentenceService = require('../../services/sentenceService.js')
const ttsService = require('../../services/ttsService.js')
const security = require('../../services/security.js')

Page({
  data: {
    // 句子数据
    allSentences: [],
    filteredSentences: [],
    
    // 分类筛选
    availableCategories: [],
    selectedCategory: '',
    selectedDifficulty: 0,
    
    // 统计信息
    statistics: {
      totalSentences: 0,
      practicedSentences: 0,
      completionRate: 0,
      averageQuality: 0
    },
    
    // UI状态
    isLoading: true,
    searchKeyword: '',
    sortMode: 'default', // 'default', 'difficulty', 'category', 'practiced'
    
    // 播放状态
    currentPlayingId: null,
    isPlaying: false
  },
  
  onLoad() {
    console.log('📚 语料库页面加载')
    this.initPage()
  },

  onShow() {
    // 页面显示时刷新统计数据
    this.loadStatistics()
    
    // 添加调试信息
    console.log('📚 语料库页面显示，当前数据状态:', {
      allSentencesCount: this.data.allSentences.length,
      filteredSentencesCount: this.data.filteredSentences.length,
      selectedCategory: this.data.selectedCategory,
      selectedDifficulty: this.data.selectedDifficulty,
      isLoading: this.data.isLoading,
      firstSentence: this.data.filteredSentences[0] ? {
        id: this.data.filteredSentences[0].id,
        content: this.data.filteredSentences[0].content
      } : 'NO_SENTENCES'
    })
    
    // 如果没有句子数据，尝试重新加载
    if (this.data.allSentences.length === 0 && !this.data.isLoading) {
      console.warn('⚠️ 检测到没有句子数据，重新初始化')
      this.initPage()
    }
  },

  // 初始化页面
  async initPage() {
    try {
      // 加载句子数据
      await this.loadSentences()
      
      // 加载分类数据
      this.loadCategories()
      
      // 加载统计信息
      this.loadStatistics()
      
      this.setData({ isLoading: false })
      
    } catch (error) {
      console.error('❌ 语料库页面初始化失败:', error)
      this.setData({ isLoading: false })
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载句子数据
  async loadSentences() {
    try {
      // 确保sentenceService已初始化
      await sentenceService.initService()
      
      const sentences = sentenceService.getAllSentences()
      
      if (!sentences || sentences.length === 0) {
        console.warn('⚠️ 未获取到句子数据，尝试重新加载')
        await sentenceService.loadAllSentences()
        const retryedSentences = sentenceService.getAllSentences()
        if (!retryedSentences || retryedSentences.length === 0) {
          throw new Error('无法加载语料库数据')
        }
      }
      
      // 获取练习历史，用于标记已练习的句子
      const practiceHistory = security.secureGet('practice_history') || []
      const practicedSentenceIds = new Set(practiceHistory.map(p => p.sentenceId))
      
      // 为句子添加练习状态和显示数据
      const enrichedSentences = sentences.map(sentence => ({
        ...sentence,
        isPracticed: practicedSentenceIds.has(sentence.id),
        practiceCount: practiceHistory.filter(p => p.sentenceId === sentence.id).length,
        bestQuality: this.getBestQuality(sentence.id, practiceHistory),
        difficultyStars: '★'.repeat(sentence.difficulty || 1)
      }))
      
      this.setData({
        allSentences: enrichedSentences,
        filteredSentences: enrichedSentences
      })
      
      console.log(`📚 加载了 ${sentences.length} 个句子`)
      
    } catch (error) {
      console.error('❌ 加载句子数据失败:', error)
      
      // 显示用户友好的错误提示
      wx.showToast({
        title: '语料库加载失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 获取句子的最佳质量评分
  getBestQuality(sentenceId, practiceHistory) {
    const practices = practiceHistory.filter(p => p.sentenceId === sentenceId)
    if (practices.length === 0) return 0
    return Math.max(...practices.map(p => p.quality || 0))
  },

  // 加载分类数据
  loadCategories() {
    const categories = sentenceService.getAllCategories()
    this.setData({ availableCategories: categories })
  },

  // 加载统计信息
  loadStatistics() {
    const { allSentences } = this.data
    const practiceHistory = security.secureGet('practice_history') || []
    
    const practicedSentenceIds = new Set(practiceHistory.map(p => p.sentenceId))
    const totalSentences = allSentences.length
    const practicedSentences = practicedSentenceIds.size
    const completionRate = totalSentences > 0 ? Math.round((practicedSentences / totalSentences) * 100) : 0
    
    // 计算平均质量
    const qualitySum = practiceHistory.reduce((sum, p) => sum + (p.quality || 0), 0)
    const averageQuality = practiceHistory.length > 0 ? Math.round(qualitySum / practiceHistory.length) : 0
    
    this.setData({
      statistics: {
        totalSentences,
        practicedSentences,
        completionRate,
        averageQuality
      }
    })
  },

  // 分类筛选
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category || ''
    
    this.setData({ selectedCategory: category })
    this.applyFilters()
    
    console.log(`📂 选择分类: ${category || '全部'}`)
  },

  // 难度筛选
  onDifficultyChange(e) {
    const difficulty = parseInt(e.currentTarget.dataset.difficulty) || 0
    
    this.setData({ selectedDifficulty: difficulty })
    this.applyFilters()
    
    console.log(`⭐ 选择难度: ${difficulty || '全部'}`)
  },

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    
    this.setData({ searchKeyword: keyword })
    this.applyFilters()
  },

  // 排序模式切换
  toggleSortMode() {
    const modes = ['default', 'difficulty', 'category', 'practiced']
    const currentIndex = modes.indexOf(this.data.sortMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const nextMode = modes[nextIndex]
    
    this.setData({ sortMode: nextMode })
    this.applyFilters()
    
    const modeNames = {
      default: '默认排序',
      difficulty: '难度排序',
      category: '分类排序',
      practiced: '练习状态'
    }
    
    wx.showToast({
      title: modeNames[nextMode],
      icon: 'none',
      duration: 1500
    })
  },

  // 应用筛选条件
  applyFilters() {
    let filtered = [...this.data.allSentences]
    
    // 分类筛选
    if (this.data.selectedCategory) {
      filtered = filtered.filter(s => s.category === this.data.selectedCategory)
    }
    
    // 难度筛选
    if (this.data.selectedDifficulty > 0) {
      filtered = filtered.filter(s => s.difficulty === this.data.selectedDifficulty)
    }
    
    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(s => 
        s.content.toLowerCase().includes(keyword) ||
        s.translation.toLowerCase().includes(keyword) ||
        s.category.toLowerCase().includes(keyword)
      )
    }
    
    // 排序
    this.sortSentences(filtered)
    
    this.setData({ filteredSentences: filtered })
    
    console.log(`🔍 筛选结果: ${filtered.length} 个句子`)
  },

  // 句子排序
  sortSentences(sentences) {
    const { sortMode } = this.data
    
    switch (sortMode) {
      case 'difficulty':
        sentences.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1))
        break
      case 'category':
        sentences.sort((a, b) => a.category.localeCompare(b.category))
        break
      case 'practiced':
        sentences.sort((a, b) => {
          // 未练习的排前面，然后按练习次数排序
          if (a.isPracticed !== b.isPracticed) {
            return a.isPracticed ? 1 : -1
          }
          return (b.practiceCount || 0) - (a.practiceCount || 0)
        })
        break
      default:
        // 保持默认顺序
        break
    }
  },

  // 播放句子
  async playSentence(e) {
    // 立即提供视觉反馈
    wx.showToast({
      title: '正在播放...',
      icon: 'loading',
      duration: 500
    })
    
    console.log('🔊 playSentence 被调用:', e)
    
    const sentenceId = e.currentTarget.dataset.id
    const sentence = this.data.filteredSentences.find(s => s.id === sentenceId)
    
    console.log('🔊 播放参数:', {
      sentenceId,
      sentence: sentence ? sentence.content : 'NOT_FOUND',
      filteredCount: this.data.filteredSentences.length,
      currentPlaying: this.data.currentPlayingId,
      isPlaying: this.data.isPlaying
    })
    
    if (!sentence) {
      console.error('❌ 未找到句子:', sentenceId)
      wx.showToast({
        title: '句子不存在',
        icon: 'none'
      })
      return
    }
    
    // 如果正在播放相同句子，则停止播放
    if (this.data.currentPlayingId === sentenceId && this.data.isPlaying) {
      console.log('🔊 停止当前播放')
      this.stopPlaying()
      return
    }
    
    try {
      // 停止之前的播放
      if (this.data.isPlaying) {
        console.log('🔊 停止之前的播放')
        this.stopPlaying()
      }
      
      // 开始播放
      this.setData({
        currentPlayingId: sentenceId,
        isPlaying: true
      })
      
      console.log(`🔊 开始播放句子: ${sentence.content}`)
      
      // 检查TTS服务状态
      if (typeof ttsService.playText !== 'function') {
        throw new Error('TTS服务未正确初始化')
      }
      
      await ttsService.playText(sentence.content)
      
      console.log('🔊 播放完成')
      
      // 播放完成
      this.setData({
        currentPlayingId: null,
        isPlaying: false
      })
      
    } catch (error) {
      console.error('❌ 播放失败:', error)
      
      this.setData({
        currentPlayingId: null,
        isPlaying: false
      })
      
      wx.showToast({
        title: `播放失败: ${error.message}`,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 停止播放
  stopPlaying() {
    console.log('🔊 stopPlaying 被调用')
    
    try {
      ttsService.stopPlay()
      console.log('🔊 TTS服务停止成功')
    } catch (error) {
      console.error('❌ 停止播放失败:', error)
    }
    
    this.setData({
      currentPlayingId: null,
      isPlaying: false
    })
    
    console.log('🔊 播放状态已重置')
  },

  // 练习句子
  practiceSentence(e) {
    // 立即提供视觉反馈
    wx.showToast({
      title: '正在跳转...',
      icon: 'loading',
      duration: 500
    })
    
    console.log('🎤 practiceSentence 被调用:', e)
    
    const sentenceId = e.currentTarget.dataset.id
    const sentence = this.data.filteredSentences.find(s => s.id === sentenceId)
    
    console.log('🎤 练习参数:', {
      sentenceId,
      sentence: sentence ? sentence.content : 'NOT_FOUND',
      filteredCount: this.data.filteredSentences.length
    })
    
    if (!sentence) {
      console.error('❌ 未找到句子:', sentenceId)
      wx.showToast({
        title: '句子不存在',
        icon: 'none'
      })
      return
    }
    
    console.log(`🎤 准备跳转到练习页面: ${sentence.content}`)
    
    // 跳转到练习页面，并传递句子ID
    wx.navigateTo({
      url: `/pages/index/index?sentenceId=${sentenceId}`,
      success: () => {
        console.log('🎤 页面跳转成功')
      },
      fail: (error) => {
        console.error('❌ 页面跳转失败:', error)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 查看句子详情
  viewSentenceDetail(e) {
    const sentenceId = e.currentTarget.dataset.id
    const sentence = this.data.filteredSentences.find(s => s.id === sentenceId)
    
    if (!sentence) return
    
    const practiceInfo = sentence.isPracticed 
      ? `练习次数: ${sentence.practiceCount}\n最佳评分: ${sentence.bestQuality}分`
      : '尚未练习'
    
    wx.showModal({
      title: '句子详情',
      content: `${sentence.content}\n\n${sentence.translation}\n\n分类: ${sentence.category}\n难度: ${sentence.difficultyStars}\n\n${practiceInfo}`,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 清除筛选
  clearFilters() {
    this.setData({
      selectedCategory: '',
      selectedDifficulty: 0,
      searchKeyword: '',
      sortMode: 'default'
    })
    
    this.applyFilters()
    
    wx.showToast({
      title: '已清除筛选',
      icon: 'none'
    })
  },

  // 页面卸载时清理
  onUnload() {
    // 停止播放
    this.stopPlaying()
  },
  
  // 测试按钮点击事件
  testButtonClick() {
    console.log('🧪 测试按钮被点击')
    wx.showToast({
      title: '按钮点击正常',
      icon: 'success'
    })
  }
}) 