//library.js
const sentenceService = require('../../services/sentenceService.js')
const ttsService = require('../../services/ttsService.js')
const security = require('../../services/security.js')
const logService = require('../../services/logService.js')

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
    isPlaying: false,

    categories: [],
    levels: []
  },
  
  onLoad(options) {
    this.detailModal = this.selectComponent('#detailModal');
    this.initPage()
  },

  onShow() {
    // 页面显示时刷新统计数据
    this.loadStatistics();
    
    // onShow时只应用筛选，不重新加载数据，避免闪烁
    if (this.data.allSentences.length > 0) {
      this.applyFilters();
    }
  },

  // 增加下拉刷新处理
  onPullDownRefresh() {
    this.initPage().then(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    });
  },

  // 初始化页面
  async initPage() {
    this.setData({ isLoading: true });

    try {
      await this.loadSentences();
      // 成功后再加载依赖句子的部分
      this.loadCategoriesAndLevels(); // 移到句子加载后，确保有数据
      this.loadStatistics();
      this.applyFilters();
    } catch (error) {
      // 加载失败时，不再弹出toast，允许用户通过下拉刷新重试
      // 可以在这里设置一个错误状态，用于在UI上显示提示
      console.error('页面初始化失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载句子数据
  async loadSentences() {
    try {
      // 确保sentenceService已初始化
      await sentenceService.initService()
      
      let sentences = sentenceService.getAllSentences()
      
      if (!sentences || sentences.length === 0) {
        await sentenceService.loadAllSentences()
        sentences = sentenceService.getAllSentences()
        if (!sentences || sentences.length === 0) {
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
      
    } catch (error) {
      console.error('语料库加载失败:', error)
      throw error // 重新抛出错误，让上级函数处理
    }
  },

  // 获取句子的最佳质量评分
  getBestQuality(sentenceId, practiceHistory) {
    const practices = practiceHistory.filter(p => p.sentenceId === sentenceId)
    if (practices.length === 0) return 0
    return Math.max(...practices.map(p => p.quality || 0))
  },

  // 加载分类和难度数据
  loadCategoriesAndLevels() {
    const categories = sentenceService.getAllCategories()
    // 根据现有句子数据获取所有难度级别
    const allSentences = sentenceService.getAllSentences()
    const difficulties = [...new Set(allSentences.map(s => s.difficulty))].sort()
    const levels = difficulties.map(d => `难度${d}`)

    this.setData({
      categories: ['全部', ...categories],
      levels: ['全部', ...levels],
      availableCategories: categories // 设置可用分类，用于WXML中的循环
    })
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
    this.setData({
      selectedCategory: category
    })
    this.applyFilters()
  },

  // 难度筛选
  onDifficultyChange(e) {
    const difficulty = parseInt(e.currentTarget.dataset.difficulty) || 0
    
    this.setData({ selectedDifficulty: difficulty })
    this.applyFilters()
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
    let sentences = this.data.allSentences;
    const { selectedCategory, selectedDifficulty, searchKeyword } = this.data;

    // 1. 分类筛选
    if (selectedCategory) {
      sentences = sentences.filter(s => s.category === selectedCategory);
    }
    
    // 2. 难度筛选
    if (selectedDifficulty > 0) {
      sentences = sentences.filter(s => s.difficulty === selectedDifficulty);
    }

    // 3. 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      sentences = sentences.filter(s =>
        s.content.toLowerCase().includes(keyword) ||
        (s.translation && s.translation.toLowerCase().includes(keyword))
      );
    }
    
    // 4. 排序
    this.sortSentences(sentences);

    this.setData({
      filteredSentences: sentences
    });
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

  /**
   * TTS播放控制
   */
  async handlePlayTTS(e) {
    const { id, content } = e.currentTarget.dataset;

    if (this.data.currentPlayingId === id) {
      // 如果点击的是正在播放的句子，则停止
      ttsService.stopCurrent();
      this.setData({ currentPlayingId: null });
    } else {
      // 停止当前可能正在播放的任何其他句子
      ttsService.stopCurrent();
      
      this.setData({ currentPlayingId: id });

      try {
        await ttsService.playText(content, {
          onEnded: () => {
            // 播放正常结束后，清除播放状态
            if (this.data.currentPlayingId === id) {
              this.setData({ currentPlayingId: null });
            }
          },
          onError: () => {
             // 播放出错后，清除播放状态
            if (this.data.currentPlayingId === id) {
              this.setData({ currentPlayingId: null });
            }
          }
        });
      } catch (error) {
        // 如果调用本身就失败了，也清除状态
        this.setData({ currentPlayingId: null });
        wx.showToast({
          title: '播放失败，请稍后重试',
          icon: 'none'
        })
      }
    }
  },

  /**
   * 跳转到练习页面
   */
  handleGoToPractice(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;

    // 使用 globalData 在 tabbar 页面间传递数据
    const app = getApp()
    app.globalData.practiceTargetId = id;

    // 跳转到练习Tab页
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
      },
      fail: (err) => {
        // 清理全局变量，防止状态污染
        app.globalData.practiceTargetId = null;
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        })
      }
    });
  },

  /**
   * 查看句子详情（长按触发）
   */
  viewSentenceDetail(e) {
    const { id } = e.currentTarget.dataset;
    const sentence = this.data.allSentences.find(s => s.id === id);

    if (sentence) {
      if (this.detailModal) {
        this.detailModal.showModal(sentence);
      } else {
        // Fallback to old modal if component not ready
        wx.showModal({
          title: '练习详情',
          content: `句子：${sentence.content}\n分类：${sentence.category}\n难度：${sentence.difficulty}`,
          showCancel: false,
          confirmText: '确定'
        });
      }
    }
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

  onHide() {
    // 页面隐藏时停止播放
    if (this.data.currentPlayingId) {
      ttsService.stopCurrent();
      this.setData({ currentPlayingId: null });
    }
  },

  onUnload() {
    // 页面卸载时停止播放
    if (this.data.currentPlayingId) {
      ttsService.stopCurrent();
      this.setData({ currentPlayingId: null });
    }
  }
}) 