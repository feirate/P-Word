//history.js
const sentenceService = require('../../services/sentenceService.js')
const cloudService = require('../../services/cloudService.js')
const security = require('../../services/security.js')

Page({
  data: {
    // 练习历史数据
    practiceHistory: [],
    filteredHistory: [],
    
    // 筛选条件
    selectedDate: '',
    selectedCategory: '',
    selectedDifficulty: 0,
    availableCategories: [],
    
    // 统计数据
    statistics: {
      totalPractices: 0,
      totalTime: 0,
      avgQuality: 0,
      bestScore: 0,
      practiceStreak: 0
    },
    
    // 日期相关
    dateRange: {
      start: '',
      end: '',
      current: ''
    },
    
    // UI状态
    isLoading: true,
    showFilters: false,
    showDatePicker: false,
    chartData: null,
    
    // 同步状态
    syncStatus: null,
    lastSyncTime: '',
    sortMode: 'default'
  },
  
  onLoad() {
    this.detailModal = this.selectComponent('#detailModal');
    this.initPage()
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 初始化页面
  async initPage() {
    try {
      // 初始化日期范围
      this.initDateRange()
      
      // 加载练习历史
      await this.loadPracticeHistory()
      
      // 加载统计数据
      this.loadStatistics()
      
      // 获取可用分类
      this.loadAvailableCategories()
      
      // 获取同步状态
      this.loadSyncStatus()
      
      // 生成图表数据
      this.generateChartData()
      
      this.setData({ isLoading: false })
      
    } catch (error) {
      console.error('❌ 历史记录页面初始化失败:', error)
      this.setData({ isLoading: false })
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 初始化日期范围
  initDateRange() {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    this.setData({
      dateRange: {
        start: this.formatDate(thirtyDaysAgo),
        end: this.formatDate(today),
        current: this.formatDate(today)
      },
      selectedDate: this.formatDate(today)
    })
  },

  // 加载练习历史
  async loadPracticeHistory() {
    try {
      // 尝试从云端同步最新数据
      if (cloudService.getSyncStatus().isOnline) {
        await cloudService.performFullSync()
      }
      
      // 获取本地历史记录
      const history = security.secureGet('practice_history') || []
      
      // 按时间倒序排列并处理数据
      const sortedHistory = history
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(item => ({
          ...item,
          qualityLevel: this.getQualityLevel(item.quality),
          difficultyStars: '★'.repeat(item.difficulty || 1),
          durationText: item.duration ? (item.duration / 1000).toFixed(1) + 's' : '未知'
        }))
      
      // 设置空状态文本
      const emptyText = history.length === 0 ? '暂无练习记录' : '没有匹配的记录'
      const emptyTip = history.length === 0 ? '开始练习后这里会显示您的历史记录' : '尝试调整筛选条件'
      const showEmptyAction = history.length === 0
      
      this.setData({
        practiceHistory: sortedHistory,
        filteredHistory: sortedHistory,
        emptyText,
        emptyTip,
        showEmptyAction
      })
      
      // 应用当前筛选条件
      this.applyFilters()
      
    } catch (error) {
      console.error('❌ 加载练习历史失败:', error)
    }
  },

  // 加载统计数据
  loadStatistics() {
    const { practiceHistory } = this.data
    
    if (practiceHistory.length === 0) {
      return
    }

    // 基础统计
    const totalPractices = practiceHistory.length
    const totalTime = practiceHistory.reduce((sum, p) => sum + (p.duration || 0), 0)
    const avgQuality = practiceHistory.reduce((sum, p) => sum + (p.quality || 0), 0) / totalPractices
    const bestScore = Math.max(...practiceHistory.map(p => p.quality || 0))
    
    // 计算练习连续天数
    const practiceStreak = this.calculatePracticeStreak(practiceHistory)
    
    this.setData({
      statistics: {
        totalPractices,
        totalTime: Math.round(totalTime / 60), // 转换为分钟
        avgQuality: Math.round(avgQuality),
        bestScore,
        practiceStreak
      }
    })
  },

  // 计算练习连续天数
  calculatePracticeStreak(history) {
    if (history.length === 0) return 0
    
    const today = new Date()
    const dates = [...new Set(history.map(h => h.date))].sort().reverse()
    
    let streak = 0
    let currentDate = this.formatDate(today)
    
    for (const date of dates) {
      if (date === currentDate) {
        streak++
        // 前一天
        const prevDay = new Date(currentDate)
        prevDay.setDate(prevDay.getDate() - 1)
        currentDate = this.formatDate(prevDay)
      } else {
        break
      }
    }
    
    return streak
  },

  // 加载可用分类
  loadAvailableCategories() {
    const categories = sentenceService.getAllCategories()
    this.setData({ availableCategories: categories })
  },

  // 加载同步状态
  loadSyncStatus() {
    const syncStatus = cloudService.getSyncStatus()
    const lastSyncTime = syncStatus.lastSyncTime 
      ? new Date(syncStatus.lastSyncTime).toLocaleString()
      : '从未同步'
    
    this.setData({
      syncStatus,
      lastSyncTime
    })
  },

  // 生成图表数据
  generateChartData() {
    const { practiceHistory } = this.data
    
    // 按日期统计练习次数和质量
    const dateStats = {}
    
    practiceHistory.forEach(practice => {
      const date = practice.date
      if (!dateStats[date]) {
        dateStats[date] = {
          count: 0,
          totalQuality: 0,
          totalTime: 0
        }
      }
      
      dateStats[date].count++
      dateStats[date].totalQuality += practice.quality || 0
      dateStats[date].totalTime += practice.duration || 0
    })
    
    // 转换为图表数据格式
    const chartData = Object.keys(dateStats)
      .sort()
      .slice(-7) // 最近7天
      .map(date => ({
        date: this.formatDateShort(new Date(date)),
        count: dateStats[date].count,
        avgQuality: Math.round(dateStats[date].totalQuality / dateStats[date].count),
        totalTime: Math.round(dateStats[date].totalTime / 60) // 转换为分钟
      }))
    
    this.setData({ chartData })
  },

  // 应用筛选条件
  applyFilters() {
    let { practiceHistory, selectedDate, selectedCategory, selectedDifficulty } = this.data
    let filtered = [...practiceHistory]
    
    // 日期筛选
    if (selectedDate) {
      filtered = filtered.filter(p => p.date === selectedDate)
    }
    
    // 分类筛选
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    // 难度筛选
    if (selectedDifficulty > 0) {
      filtered = filtered.filter(p => p.difficulty === selectedDifficulty)
    }

    // 更新空状态文本
    const emptyText = practiceHistory.length === 0 ? '暂无练习记录' : '没有匹配的记录'
    const emptyTip = practiceHistory.length === 0 ? '开始练习后这里会显示您的历史记录' : '尝试调整筛选条件'
    const showEmptyAction = practiceHistory.length === 0
    
    this.setData({ 
      filteredHistory: filtered,
      emptyText,
      emptyTip,
      showEmptyAction
    })
  },

  // 刷新数据
  async refreshData() {
    wx.showLoading({ title: '刷新中...' })
    
    try {
      await this.loadPracticeHistory()
      this.loadStatistics()
      this.generateChartData()
      
      wx.hideLoading()
      wx.showToast({
        title: '刷新完成',
        icon: 'success',
        duration: 1500
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    }
  },

  // 手动同步
  async manualSync() {
    const result = await cloudService.manualSync()
    
    if (result.success) {
      // 重新加载数据
      await this.loadPracticeHistory()
      this.loadStatistics()
      this.loadSyncStatus()
    }
  },

  // 切换筛选器显示
  toggleFilters() {
    this.setData({
      showFilters: !this.data.showFilters
    })
  },

  // 选择日期
  onDateChange(e) {
    const selectedDate = e.detail.value
    this.setData({ selectedDate })
    this.applyFilters()
  },

  // 选择分类
  onCategoryChange(e) {
    const selectedCategory = e.detail.value
    this.setData({ selectedCategory })
    this.applyFilters()
  },

  // 选择难度
  onDifficultyChange(e) {
    const selectedDifficulty = parseInt(e.detail.value)
    this.setData({ selectedDifficulty })
    this.applyFilters()
  },

  // 清除筛选
  clearFilters() {
    this.setData({
      selectedDate: '',
      selectedCategory: '',
      selectedDifficulty: 0
    })
    this.applyFilters()
  },

  /**
   * 查看练习详情
   */
  viewPracticeDetail(e) {
    const { id } = e.currentTarget.dataset;
    const practiceRecord = this.data.practiceHistory.find(p => p.id === id);

    if (!practiceRecord) {
      console.warn('未找到对应的练习记录:', id);
      return;
    }
    
    // 获取句子原文
    const sentence = sentenceService.getSentenceById(practiceRecord.sentenceId);
    
    // 准备给弹窗的数据
    const details = {
      content: sentence ? sentence.content : '句子原文未找到',
      category: practiceRecord.category,
      difficultyStars: practiceRecord.difficultyStars,
      bestQuality: practiceRecord.quality, // 在历史记录中，bestQuality就是当次的quality
      practiceCount: 'N/A', // 历史详情不显示练习次数
      practiceTime: new Date(practiceRecord.timestamp).toLocaleString()
    };
    
    // 调用自定义弹窗
    if (this.detailModal) {
      this.detailModal.showModal(details);
    } else {
      // Fallback
      wx.showModal({
        title: '练习详情',
        content: `句子: ${details.content}\n分数: ${details.bestQuality}分`,
        showCancel: false,
      });
    }
  },

  // 删除练习记录
  deletePractice(e) {
    const practiceId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条练习记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.confirmDeletePractice(practiceId)
        }
      }
    })
  },

  // 确认删除练习记录
  confirmDeletePractice(practiceId) {
    let { practiceHistory } = this.data
    
    // 从数组中移除
    practiceHistory = practiceHistory.filter(p => p.id !== practiceId)
    
    // 保存到本地
    security.secureStorage('practice_history', practiceHistory)
    
    // 更新页面数据
    this.setData({ practiceHistory })
    this.applyFilters()
    this.loadStatistics()
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    })
  },

  // 导出数据
  async exportData() {
    try {
      const { practiceHistory, statistics } = this.data
      
      const exportData = {
        exportTime: new Date().toISOString(),
        statistics,
        practiceHistory: practiceHistory.map(p => ({
          ...p,
          practiceTime: new Date(p.timestamp).toLocaleString()
        }))
      }
      
      // 这里可以实现数据导出功能
      // 由于小程序限制，暂时显示数据摘要
      const summary = `练习统计导出\n总练习次数: ${statistics.totalPractices}\n总练习时长: ${statistics.totalTime}分钟\n平均质量: ${statistics.avgQuality}分\n最佳评分: ${statistics.bestScore}分\n连续练习: ${statistics.practiceStreak}天`
      
      wx.showModal({
        title: '数据导出',
        content: summary,
        showCancel: false,
        confirmText: '确定'
      })
      
    } catch (error) {
      console.error('❌ 数据导出失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 工具函数
  formatDate(date) {
    return date.toISOString().split('T')[0]
  },

  formatDateShort(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  getQualityLevel(quality) {
    if (quality >= 80) return 'excellent'
    if (quality >= 60) return 'good'
    return 'poor'
  },

  getQualityColor(quality) {
    if (quality >= 80) return '#52c41a'
    if (quality >= 60) return '#1890ff'
    if (quality >= 40) return '#faad14'
    return '#f5222d'
  },

  // 跳转到练习页面
  goToPractice() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  onSortModeChange(e) {
    const nextMode = e.detail.value;
    this.setData({
      sortMode: nextMode
    })
    this.applyFilters()
  }
}) 