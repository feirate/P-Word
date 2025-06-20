/**
 * P-Word 语料库管理服务
 * 提供智能句子推荐、分类筛选、难度适配等功能
 */

const security = require('./security.js')

class SentenceService {
  constructor() {
    this.sentences = []
    this.currentIndex = 0
    this.userPreferences = null
    this.practiceHistory = []
    
    this.initService()
  }

  /**
   * 初始化服务
   */
  async initService() {
    await this.loadAllSentences()
    this.loadUserPreferences()
    this.loadPracticeHistory()
  }

  /**
   * 加载所有语料库
   */
  async loadAllSentences() {
    try {
      // 加载初级语料库
      const beginnerData = await this.loadSentenceFile('/assets/sentences/beginner.json')
      
      // 加载中级语料库
      const intermediateData = await this.loadSentenceFile('/assets/sentences/intermediate.json')
      
      // 合并所有句子
      this.sentences = [...beginnerData, ...intermediateData]
      
      console.log(`📚 语料库加载完成: ${this.sentences.length} 句`)
      
      return this.sentences
    } catch (error) {
      console.error('❌ 语料库加载失败:', error)
      // 返回备用数据
      this.sentences = this.getBackupSentences()
      return this.sentences
    }
  }

  /**
   * 加载语料库文件
   * @param {string} filePath 文件路径
   */
  loadSentenceFile(filePath) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: filePath,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`加载失败: ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }

  /**
   * 获取备用句子（防止文件加载失败）
   */
  getBackupSentences() {
    return [
      {
        id: 'backup_001',
        content: 'Hello, how are you?',
        translation: '你好，你好吗？',
        level: '初级',
        category: '问候',
        tags: ['greeting', 'basic'],
        difficulty: 1
      },
      {
        id: 'backup_002',
        content: 'Nice to meet you.',
        translation: '很高兴见到你。',
        level: '初级',
        category: '问候',
        tags: ['greeting', 'polite'],
        difficulty: 1
      }
    ]
  }

  /**
   * 加载用户偏好设置
   */
  loadUserPreferences() {
    const preferences = security.secureGet('user_preferences') || {
      preferredLevel: 'mixed',     // 'beginner', 'intermediate', 'mixed'
      preferredCategories: [],     // 偏好分类
      difficultyRange: [1, 2],     // 难度范围
      avoidRepeats: true,          // 避免重复
      smartRecommend: true,        // 智能推荐
      lastUpdateTime: Date.now()
    }
    
    this.userPreferences = preferences
    console.log('👤 用户偏好加载:', preferences)
  }

  /**
   * 加载练习历史
   */
  loadPracticeHistory() {
    const history = security.secureGet('practice_history') || []
    this.practiceHistory = history
    console.log(`📈 练习历史加载: ${history.length} 条记录`)
  }

  /**
   * 获取推荐句子
   * @param {Object} options 推荐选项
   * @returns {Object} 推荐的句子
   */
  getRecommendedSentence(options = {}) {
    const {
      excludeCompleted = true,
      smartRecommend = true,
      forceLevel = null
    } = options

    let candidates = [...this.sentences]

    // 1. 根据级别筛选
    if (forceLevel) {
      candidates = candidates.filter(s => s.level === forceLevel)
    } else if (this.userPreferences.preferredLevel !== 'mixed') {
      candidates = candidates.filter(s => s.level === this.userPreferences.preferredLevel)
    }

    // 2. 根据难度范围筛选
    const [minDiff, maxDiff] = this.userPreferences.difficultyRange
    candidates = candidates.filter(s => s.difficulty >= minDiff && s.difficulty <= maxDiff)

    // 3. 根据偏好分类筛选
    if (this.userPreferences.preferredCategories.length > 0) {
      candidates = candidates.filter(s => 
        this.userPreferences.preferredCategories.includes(s.category)
      )
    }

    // 4. 排除已练习的句子（如果设置了避免重复）
    if (excludeCompleted && this.userPreferences.avoidRepeats) {
      const completedIds = this.getCompletedSentenceIds()
      candidates = candidates.filter(s => !completedIds.includes(s.id))
    }

    // 5. 如果候选句子为空，放宽条件
    if (candidates.length === 0) {
      candidates = this.sentences.filter(s => 
        s.difficulty <= maxDiff + 1 // 放宽难度要求
      )
    }

    // 6. 智能推荐排序
    if (smartRecommend && candidates.length > 1) {
      candidates = this.sortBySmartRecommendation(candidates)
    }

    // 7. 返回推荐结果
    const recommended = candidates[0] || this.sentences[0]
    
    console.log(`🎯 推荐句子: [${recommended.level}] ${recommended.content}`)
    return recommended
  }

  /**
   * 智能推荐排序
   * @param {Array} sentences 候选句子
   * @returns {Array} 排序后的句子
   */
  sortBySmartRecommendation(sentences) {
    return sentences.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      // 1. 难度适配评分（偏好中等难度）
      const userLevel = this.getUserLevel()
      scoreA += this.getDifficultyScore(a.difficulty, userLevel)
      scoreB += this.getDifficultyScore(b.difficulty, userLevel)

      // 2. 分类多样性评分
      scoreA += this.getCategoryDiversityScore(a.category)
      scoreB += this.getCategoryDiversityScore(b.category)

      // 3. 练习频率评分（避免过度重复）
      scoreA += this.getFrequencyScore(a.id)
      scoreB += this.getFrequencyScore(b.id)

      // 4. 时间间隔评分（适当的复习间隔）
      scoreA += this.getIntervalScore(a.id)
      scoreB += this.getIntervalScore(b.id)

      return scoreB - scoreA // 降序排列
    })
  }

  /**
   * 获取用户当前水平
   */
  getUserLevel() {
    if (this.practiceHistory.length === 0) return 1

    // 根据最近的练习质量评估用户水平
    const recentPractices = this.practiceHistory.slice(-10) // 最近10次练习
    const avgQuality = recentPractices.reduce((sum, p) => sum + (p.quality || 60), 0) / recentPractices.length

    if (avgQuality >= 80) return 2.5 // 接近高级
    if (avgQuality >= 60) return 2.0 // 中级
    return 1.5 // 初级偏上
  }

  /**
   * 计算难度适配评分
   */
  getDifficultyScore(difficulty, userLevel) {
    const diff = Math.abs(difficulty - userLevel)
    if (diff === 0) return 10       // 完全匹配
    if (diff <= 0.5) return 8       // 接近匹配
    if (diff <= 1) return 5         // 一般匹配
    return 0                        // 不匹配
  }

  /**
   * 计算分类多样性评分
   */
  getCategoryDiversityScore(category) {
    const recentCategories = this.practiceHistory
      .slice(-5)
      .map(h => h.category)
      .filter(c => c)

    const repeatCount = recentCategories.filter(c => c === category).length
    return Math.max(0, 5 - repeatCount * 2) // 重复越多评分越低
  }

  /**
   * 计算练习频率评分
   */
  getFrequencyScore(sentenceId) {
    const practices = this.practiceHistory.filter(h => h.sentenceId === sentenceId)
    if (practices.length === 0) return 10  // 新句子优先
    if (practices.length <= 2) return 5    // 练习1-2次
    return 0                               // 练习过多
  }

  /**
   * 计算时间间隔评分
   */
  getIntervalScore(sentenceId) {
    const lastPractice = this.practiceHistory
      .filter(h => h.sentenceId === sentenceId)
      .sort((a, b) => b.timestamp - a.timestamp)[0]

    if (!lastPractice) return 0

    const hoursSinceLastPractice = (Date.now() - lastPractice.timestamp) / (1000 * 60 * 60)
    
    if (hoursSinceLastPractice < 1) return 0      // 刚练习过
    if (hoursSinceLastPractice < 24) return 3     // 24小时内
    if (hoursSinceLastPractice < 72) return 7     // 3天内（良好复习间隔）
    return 5                                      // 超过3天
  }

  /**
   * 获取已完成的句子ID列表
   */
  getCompletedSentenceIds() {
    return this.practiceHistory
      .filter(h => h.completed && h.quality >= 60) // 质量评分60以上算完成
      .map(h => h.sentenceId)
  }

  /**
   * 按分类获取句子
   * @param {string} category 分类名称
   * @returns {Array} 该分类的句子列表
   */
  getSentencesByCategory(category) {
    return this.sentences.filter(s => s.category === category)
  }

  /**
   * 按难度获取句子
   * @param {number} difficulty 难度等级
   * @returns {Array} 该难度的句子列表
   */
  getSentencesByDifficulty(difficulty) {
    return this.sentences.filter(s => s.difficulty === difficulty)
  }

  /**
   * 按标签搜索句子
   * @param {Array} tags 标签数组
   * @returns {Array} 包含这些标签的句子
   */
  getSentencesByTags(tags) {
    return this.sentences.filter(s => 
      tags.some(tag => s.tags.includes(tag))
    )
  }

  /**
   * 搜索句子
   * @param {string} keyword 搜索关键词
   * @returns {Array} 匹配的句子列表
   */
  searchSentences(keyword) {
    const lowerKeyword = keyword.toLowerCase()
    return this.sentences.filter(s => 
      s.content.toLowerCase().includes(lowerKeyword) ||
      s.translation.includes(keyword) ||
      s.category.includes(keyword)
    )
  }

  /**
   * 记录练习历史
   * @param {Object} practiceData 练习数据
   */
  recordPractice(practiceData) {
    const record = {
      id: security.generateSecureId(),
      sentenceId: practiceData.sentenceId,
      category: practiceData.category,
      difficulty: practiceData.difficulty,
      quality: practiceData.quality,
      duration: practiceData.duration,
      completed: practiceData.quality >= 60,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    }

    this.practiceHistory.unshift(record) // 添加到开头

    // 保持历史记录在合理范围内
    if (this.practiceHistory.length > 1000) {
      this.practiceHistory = this.practiceHistory.slice(0, 1000)
    }

    // 安全存储
    security.secureStorage('practice_history', this.practiceHistory)
    
    console.log('📝 练习记录已保存:', record)
  }

  /**
   * 更新用户偏好
   * @param {Object} newPreferences 新的偏好设置
   */
  updateUserPreferences(newPreferences) {
    this.userPreferences = {
      ...this.userPreferences,
      ...newPreferences,
      lastUpdateTime: Date.now()
    }

    security.secureStorage('user_preferences', this.userPreferences)
    console.log('⚙️ 用户偏好已更新:', this.userPreferences)
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计数据
   */
  getStatistics() {
    const today = new Date().toISOString().split('T')[0]
    const todayPractices = this.practiceHistory.filter(h => h.date === today)
    
    const categoryStats = {}
    const difficultyStats = {}
    
    this.practiceHistory.forEach(h => {
      // 分类统计
      if (!categoryStats[h.category]) {
        categoryStats[h.category] = { count: 0, avgQuality: 0 }
      }
      categoryStats[h.category].count++
      
      // 难度统计
      if (!difficultyStats[h.difficulty]) {
        difficultyStats[h.difficulty] = { count: 0, avgQuality: 0 }
      }
      difficultyStats[h.difficulty].count++
    })

    return {
      total: {
        sentences: this.sentences.length,
        practiced: new Set(this.practiceHistory.map(h => h.sentenceId)).size,
        practices: this.practiceHistory.length
      },
      today: {
        practices: todayPractices.length,
        avgQuality: todayPractices.length > 0 
          ? todayPractices.reduce((sum, p) => sum + p.quality, 0) / todayPractices.length 
          : 0
      },
      categories: categoryStats,
      difficulties: difficultyStats,
      userLevel: this.getUserLevel(),
      completionRate: this.getCompletedSentenceIds().length / this.sentences.length * 100
    }
  }

  /**
   * 获取所有可用的分类
   * @returns {Array} 分类列表
   */
  getAllCategories() {
    return [...new Set(this.sentences.map(s => s.category))]
  }

  /**
   * 获取所有可用的标签
   * @returns {Array} 标签列表
   */
  getAllTags() {
    const allTags = this.sentences.reduce((tags, sentence) => {
      return tags.concat(sentence.tags)
    }, [])
    return [...new Set(allTags)]
  }

  /**
   * 重置练习历史（谨慎使用）
   */
  resetPracticeHistory() {
    this.practiceHistory = []
    security.secureStorage('practice_history', [])
    console.log('🔄 练习历史已重置')
  }

  /**
   * 获取当前句子
   */
  getCurrentSentence() {
    if (this.sentences.length === 0) return null
    return this.sentences[this.currentIndex] || this.sentences[0]
  }

  /**
   * 设置当前句子索引
   */
  setCurrentIndex(index) {
    if (index >= 0 && index < this.sentences.length) {
      this.currentIndex = index
    }
  }

  /**
   * 获取句子总数
   */
  getTotalCount() {
    return this.sentences.length
  }
}

// 创建全局语料库服务实例
const sentenceService = new SentenceService()

module.exports = sentenceService 