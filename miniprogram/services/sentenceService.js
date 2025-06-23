/**
 * P-Word 语料库管理服务
 * 提供智能句子推荐、分类筛选、难度适配等功能
 */

const security = require('./security.js')
const { logger } = require('./logService.js')

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
   * 加载所有语料库（修复版 - 优先使用内置数据）
   */
  async loadAllSentences() {
    try {
      logger.info('SENTENCE', '语料库加载开始')
      
      // 直接使用内置数据确保稳定性
      const beginnerData = this.getBeginnerSentences()
      const intermediateData = this.getIntermediateSentences()
      const advancedData = this.getAdvancedSentences()
      
      // 合并所有句子
      this.sentences = [...beginnerData, ...intermediateData, ...advancedData]
      
      logger.info('SENTENCE', `语料库加载完成: ${this.sentences.length} 句`)
      logger.debug('SENTENCE', `语料库统计: ${beginnerData.length} 条初级，${intermediateData.length} 条中级，${advancedData.length} 条高级`)
      
      return this.sentences
    } catch (error) {
      logger.error('SENTENCE', '语料库加载失败:', error)
      // 返回最小备用数据
      this.sentences = this.getBackupSentences()
      logger.warn('SENTENCE', '已切换到最小备用语料库')
      return this.sentences
    }
  }

  /**
   * 加载语料库文件（修复版 - 使用文件系统API）
   * @param {string} level 语料库级别：'beginner' 或 'intermediate'
   */
  loadSentenceFile(level) {
    return new Promise((resolve, reject) => {
      const filePath = `/assets/sentences/${level}.json`
      
      // 使用微信小程序文件系统API
      const fs = wx.getFileSystemManager()
      
      fs.readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            logger.debug('SENTENCE', `${level}语料库文件加载成功: ${data.length} 句`)
            resolve(data)
          } catch (parseError) {
            logger.error('SENTENCE', `${level}语料库JSON解析失败:`, parseError)
            reject(parseError)
          }
        },
        fail: (error) => {
          logger.warn('SENTENCE', `${level}语料库文件读取失败，使用备用方法:`, error.message)
          // 尝试备用方法：直接导入数据
          this.loadSentenceDataFallback(level)
            .then(resolve)
            .catch(reject)
        }
      })
    })
  }

  /**
   * 备用加载方法 - 内置语料库数据
   * @param {string} level 语料库级别
   */
  async loadSentenceDataFallback(level) {
    logger.debug('SENTENCE', `使用备用方法加载${level}语料库`)
    
    if (level === 'beginner') {
      return this.getBeginnerSentences()
    } else if (level === 'intermediate') {
      return this.getIntermediateSentences()
    } else {
      return []
    }
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
   * 获取初级语料库数据（内置备用）
   */
  getBeginnerSentences() {
    return [
      {
        id: 'beginner_001',
        content: 'Hello, how are you?',
        translation: '你好，你好吗？',
        level: '初级',
        category: '问候',
        tags: ['greeting', 'basic'],
        difficulty: 1
      },
      {
        id: 'beginner_002',
        content: 'Nice to meet you.',
        translation: '很高兴见到你。',
        level: '初级',
        category: '问候',
        tags: ['greeting', 'polite'],
        difficulty: 1
      },
      {
        id: 'beginner_003',
        content: "What's your name?",
        translation: '你叫什么名字？',
        level: '初级',
        category: '自我介绍',
        tags: ['introduction', 'question'],
        difficulty: 1
      },
      {
        id: 'beginner_004',
        content: "I'm fine, thank you.",
        translation: '我很好，谢谢。',
        level: '初级',
        category: '回应',
        tags: ['response', 'polite'],
        difficulty: 1
      },
      {
        id: 'beginner_005',
        content: 'Where are you from?',
        translation: '你来自哪里？',
        level: '初级',
        category: '自我介绍',
        tags: ['introduction', 'location'],
        difficulty: 1
      },
      {
        id: 'beginner_006',
        content: "I'm from China.",
        translation: '我来自中国。',
        level: '初级',
        category: '自我介绍',
        tags: ['introduction', 'location'],
        difficulty: 1
      },
      {
        id: 'beginner_007',
        content: 'How old are you?',
        translation: '你多大了？',
        level: '初级',
        category: '个人信息',
        tags: ['age', 'question'],
        difficulty: 1
      },
      {
        id: 'beginner_008',
        content: "I'm twenty years old.",
        translation: '我二十岁。',
        level: '初级',
        category: '个人信息',
        tags: ['age', 'number'],
        difficulty: 1
      },
      {
        id: 'beginner_009',
        content: 'What do you do?',
        translation: '你是做什么工作的？',
        level: '初级',
        category: '职业',
        tags: ['job', 'question'],
        difficulty: 1
      },
      {
        id: 'beginner_010',
        content: "I'm a student.",
        translation: '我是学生。',
        level: '初级',
        category: '职业',
        tags: ['job', 'student'],
        difficulty: 1
      },
      {
        id: 'beginner_011',
        content: 'Excuse me.',
        translation: '不好意思，打扰一下。',
        level: '初级',
        category: '礼貌用语',
        tags: ['polite', 'attention'],
        difficulty: 1
      },
      {
        id: 'beginner_012',
        content: 'Thank you very much.',
        translation: '非常感谢。',
        level: '初级',
        category: '礼貌用语',
        tags: ['thanks', 'polite'],
        difficulty: 1
      },
      {
        id: 'beginner_013',
        content: "You're welcome.",
        translation: '不客气。',
        level: '初级',
        category: '礼貌用语',
        tags: ['response', 'polite'],
        difficulty: 1
      },
      {
        id: 'beginner_014',
        content: "I'm sorry.",
        translation: '对不起。',
        level: '初级',
        category: '道歉',
        tags: ['apology', 'polite'],
        difficulty: 1
      },
      {
        id: 'beginner_015',
        content: 'No problem.',
        translation: '没问题。',
        level: '初级',
        category: '回应',
        tags: ['response', 'reassurance'],
        difficulty: 1
      },
      {
        id: 'beginner_016',
        content: 'What time is it?',
        translation: '现在几点了？',
        level: '初级',
        category: '时间',
        tags: ['time', 'question'],
        difficulty: 1
      },
      {
        id: 'beginner_017',
        content: "It's three o'clock.",
        translation: '现在三点。',
        level: '初级',
        category: '时间',
        tags: ['time', 'number'],
        difficulty: 1
      },
      {
        id: 'beginner_018',
        content: 'See you later.',
        translation: '回头见。',
        level: '初级',
        category: '告别',
        tags: ['goodbye', 'casual'],
        difficulty: 1
      },
      {
        id: 'beginner_019',
        content: 'Good morning.',
        translation: '早上好。',
        level: '初级',
        category: '问候',
        tags: ['greeting', 'morning'],
        difficulty: 1
      },
      {
        id: 'beginner_020',
        content: 'Good night.',
        translation: '晚安。',
        level: '初级',
        category: '告别',
        tags: ['goodbye', 'night'],
        difficulty: 1
      }
    ]
  }

  /**
   * 获取中级语料库数据（内置备用）
   */
  getIntermediateSentences() {
    return [
      {
        id: 'intermediate_001',
        content: 'Could you please help me with this?',
        translation: '你能帮我处理这个吗？',
        level: '中级',
        category: '请求帮助',
        tags: ['help', 'polite', 'modal'],
        difficulty: 2
      },
      {
        id: 'intermediate_002',
        content: 'I would like to make a reservation.',
        translation: '我想预订。',
        level: '中级',
        category: '服务',
        tags: ['reservation', 'service', 'modal'],
        difficulty: 2
      },
      {
        id: 'intermediate_003',
        content: 'Have you been to Beijing before?',
        translation: '你以前去过北京吗？',
        level: '中级',
        category: '经历',
        tags: ['experience', 'present_perfect', 'travel'],
        difficulty: 2
      },
      {
        id: 'intermediate_004',
        content: 'I have been learning English for three years.',
        translation: '我学英语已经三年了。',
        level: '中级',
        category: '经历',
        tags: ['experience', 'present_perfect', 'duration'],
        difficulty: 2
      },
      {
        id: 'intermediate_005',
        content: 'If I were you, I would take the job.',
        translation: '如果我是你，我会接受这份工作。',
        level: '中级',
        category: '建议',
        tags: ['advice', 'conditional', 'subjunctive'],
        difficulty: 3
      }
    ]
  }

  /**
   * 获取高级语料库数据（新增）
   */
  getAdvancedSentences() {
    return [
      {
        id: 'advanced_001',
        content: 'If I were you, I would reconsider that decision carefully.',
        translation: '如果我是你，我会仔细重新考虑那个决定。',
        level: '高级',
        category: '建议',
        tags: ['advice', 'conditional', 'formal'],
        difficulty: 3
      },
      {
        id: 'advanced_002',
        content: 'Despite the challenges, we managed to complete the project on time.',
        translation: '尽管面临挑战，我们还是按时完成了项目。',
        level: '高级',
        category: '工作',
        tags: ['work', 'achievement', 'challenges'],
        difficulty: 3
      },
      {
        id: 'advanced_003',
        content: 'I appreciate your patience while we resolve this issue.',
        translation: '我们解决这个问题期间，感谢您的耐心。',
        level: '高级',
        category: '客服',
        tags: ['customer service', 'appreciation', 'formal'],
        difficulty: 3
      },
      {
        id: 'advanced_004',
        content: 'The presentation was both informative and engaging.',
        translation: '这个演示既有信息量又很吸引人。',
        level: '高级',
        category: '评价',
        tags: ['evaluation', 'presentation', 'positive'],
        difficulty: 3
      },
      {
        id: 'advanced_005',
        content: 'I would like to propose an alternative solution to this problem.',
        translation: '我想为这个问题提出一个替代解决方案。',
        level: '高级',
        category: '商务',
        tags: ['business', 'proposal', 'solution'],
        difficulty: 3
      },
      {
        id: 'advanced_006',
        content: 'The economic situation has improved significantly over the past year.',
        translation: '过去一年经济状况有了显著改善。',
        level: '高级',
        category: '经济',
        tags: ['economy', 'improvement', 'analysis'],
        difficulty: 3
      },
      {
        id: 'advanced_007',
        content: "It's essential that we maintain the highest standards of quality.",
        translation: '我们必须保持最高的质量标准。',
        level: '高级',
        category: '质量管理',
        tags: ['quality', 'standards', 'importance'],
        difficulty: 3
      },
      {
        id: 'advanced_008',
        content: 'The research findings suggest a strong correlation between these factors.',
        translation: '研究结果表明这些因素之间存在强相关性。',
        level: '高级',
        category: '学术',
        tags: ['research', 'correlation', 'academic'],
        difficulty: 3
      },
      {
        id: 'advanced_009',
        content: 'We need to implement these changes gradually to minimize disruption.',
        translation: '我们需要逐步实施这些变化以减少干扰。',
        level: '高级',
        category: '管理',
        tags: ['management', 'implementation', 'strategy'],
        difficulty: 3
      },
      {
        id: 'advanced_010',
        content: "I'm confident that this investment will yield positive results.",
        translation: '我相信这项投资会产生积极的结果。',
        level: '高级',
        category: '投资',
        tags: ['investment', 'confidence', 'results'],
        difficulty: 3
      },
      {
        id: 'advanced_011',
        content: 'The complexity of this issue requires careful consideration.',
        translation: '这个问题的复杂性需要仔细考虑。',
        level: '高级',
        category: '分析',
        tags: ['complexity', 'analysis', 'consideration'],
        difficulty: 3
      },
      {
        id: 'advanced_012',
        content: 'We should explore all available options before making a decision.',
        translation: '我们应该在做决定之前探索所有可用的选择。',
        level: '高级',
        category: '决策',
        tags: ['decision making', 'options', 'exploration'],
        difficulty: 3
      },
      {
        id: 'advanced_013',
        content: 'The technological advancement has revolutionized our industry.',
        translation: '技术进步已经彻底改变了我们的行业。',
        level: '高级',
        category: '技术',
        tags: ['technology', 'revolution', 'industry'],
        difficulty: 3
      },
      {
        id: 'advanced_014',
        content: 'I would appreciate it if you could provide more detailed information.',
        translation: '如果您能提供更详细的信息，我将不胜感激。',
        level: '高级',
        category: '请求',
        tags: ['request', 'formal', 'detailed'],
        difficulty: 3
      },
      {
        id: 'advanced_015',
        content: 'The environmental impact of this project must be carefully assessed.',
        translation: '必须仔细评估这个项目的环境影响。',
        level: '高级',
        category: '环保',
        tags: ['environment', 'assessment', 'impact'],
        difficulty: 3
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
    logger.debug('SENTENCE', '用户偏好加载完成')
  }

  /**
   * 加载练习历史
   */
  loadPracticeHistory() {
    const history = security.secureGet('practice_history') || []
    this.practiceHistory = history
    logger.debug('SENTENCE', `练习历史加载: ${history.length} 条记录`)
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
      forceLevel = null,
      excludeIds = [], // 排除特定ID的句子
      categoryFilter = null, // 新增：指定分类过滤
      random = false, // 新增：随机模式
      sequential = false // 新增：顺序模式
    } = options

    let candidates = [...this.sentences]

    // 0. 排除指定的句子ID
    if (excludeIds.length > 0) {
      candidates = candidates.filter(s => !excludeIds.includes(s.id))
    }

    // 1. 根据级别筛选
    if (forceLevel) {
      candidates = candidates.filter(s => s.level === forceLevel)
    } else if (this.userPreferences.preferredLevel !== 'mixed') {
      candidates = candidates.filter(s => s.level === this.userPreferences.preferredLevel)
    }

    // 2. 根据难度范围筛选
    const [minDiff, maxDiff] = this.userPreferences.difficultyRange
    candidates = candidates.filter(s => s.difficulty >= minDiff && s.difficulty <= maxDiff)

    // 3. 根据分类筛选（优先使用categoryFilter参数）
    if (categoryFilter) {
      candidates = candidates.filter(s => s.category === categoryFilter)
    } else if (this.userPreferences.preferredCategories.length > 0) {
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
      
      // 如果还是为空，使用所有句子
      if (candidates.length === 0) {
        candidates = [...this.sentences]
      }
    }

    // 6. 根据模式选择推荐策略
    let recommended
    
    if (random && candidates.length > 0) {
      // 随机模式
      const randomIndex = Math.floor(Math.random() * candidates.length)
      recommended = candidates[randomIndex]
    } else if (sequential && candidates.length > 0) {
      // 顺序模式（循环选择）
      this.currentIndex = (this.currentIndex || 0) % candidates.length
      recommended = candidates[this.currentIndex]
      this.currentIndex++
    } else if (smartRecommend && candidates.length > 1) {
      // 智能推荐排序
      candidates = this.sortBySmartRecommendation(candidates)
      recommended = candidates[0]
    } else {
      // 默认选择第一个
      recommended = candidates[0]
    }

    // 7. 最终fallback
    if (!recommended) {
      recommended = this.sentences[0]
    }
    
    logger.debug('SENTENCE', `推荐句子: [${recommended.level}] ${recommended.content}`)
    return recommended
  }

  /**
   * 智能推荐排序（修复版 - 增加随机性和多样性）
   * @param {Array} sentences 候选句子
   * @returns {Array} 排序后的句子
   */
  sortBySmartRecommendation(sentences) {
    // 计算每个句子的评分
    const scoredSentences = sentences.map(sentence => {
      let score = 0

      // 1. 难度适配评分（偏好中等难度）
      const userLevel = this.getUserLevel()
      score += this.getDifficultyScore(sentence.difficulty, userLevel)

      // 2. 分类多样性评分
      score += this.getCategoryDiversityScore(sentence.category)

      // 3. 练习频率评分（避免过度重复）
      score += this.getFrequencyScore(sentence.id)

      // 4. 时间间隔评分（适当的复习间隔）
      score += this.getIntervalScore(sentence.id)

      // 5. 新增：随机性评分（避免总是选择相同句子）
      score += Math.random() * 5

      return { sentence, score }
    })

    // 按评分排序
    scoredSentences.sort((a, b) => b.score - a.score)

    // 从前30%的高分句子中随机选择，增加多样性
    const topCandidatesCount = Math.max(1, Math.ceil(scoredSentences.length * 0.3))
    const topCandidates = scoredSentences.slice(0, topCandidatesCount)
    
    // 打乱顺序
    for (let i = topCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]]
    }

    // 返回重新排序的句子列表
    const remainingCandidates = scoredSentences.slice(topCandidatesCount)
    return [
      ...topCandidates.map(item => item.sentence),
      ...remainingCandidates.map(item => item.sentence)
    ]
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
    
    logger.info('SENTENCE', '练习记录已保存')
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
    logger.info('SENTENCE', '用户偏好已更新')
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
    logger.info('SENTENCE', '练习历史已重置')
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

  /**
   * 获取所有句子
   * @returns {Array} 所有已加载的句子数组
   */
  getAllSentences() {
    return this.sentences
  }
}

// 创建全局语料库服务实例
const sentenceService = new SentenceService()

module.exports = sentenceService 