/**
 * P-Word 语料库内容分析与扩展方案
 * 分析现有语料使用情况，制定扩展策略
 */

// 首先加载模拟微信环境
require('./mockWxEnvironment.js')

const sentenceService = require('../miniprogram/services/sentenceService.js')

class SentenceLibraryAnalyzer {
  constructor() {
    this.analysisResults = {}
    this.expansionPlan = {}
  }

  /**
   * 运行完整的语料库分析
   */
  async runFullAnalysis() {
    console.log('📚 P-Word 语料库内容分析与扩展方案\n')
    console.log('=' .repeat(60))
    
    // 初始化语料库服务
    await sentenceService.initService()
    
    // 执行各项分析
    this.analyzeCurrentLibrary()
    this.analyzeCategoryDistribution()
    this.analyzeDifficultyDistribution()
    this.analyzeContentQuality()
    this.generateExpansionPlan()
    this.createImplementationRoadmap()
    
    console.log('\n' + '=' .repeat(60))
    console.log('🎉 语料库分析完成！')
  }

  /**
   * 分析当前语料库基本情况
   */
  analyzeCurrentLibrary() {
    console.log('\n📊 当前语料库基本分析\n')
    
    const sentences = sentenceService.sentences
    const totalCount = sentences.length
    
    // 按级别统计
    const levelStats = {}
    sentences.forEach(sentence => {
      levelStats[sentence.level] = (levelStats[sentence.level] || 0) + 1
    })
    
    // 按难度统计
    const difficultyStats = {}
    sentences.forEach(sentence => {
      difficultyStats[sentence.difficulty] = (difficultyStats[sentence.difficulty] || 0) + 1
    })
    
    console.log(`总句子数量: ${totalCount}`)
    console.log('\n📈 级别分布:')
    Object.entries(levelStats).forEach(([level, count]) => {
      const percentage = ((count / totalCount) * 100).toFixed(1)
      console.log(`  ${level}: ${count} 句 (${percentage}%)`)
    })
    
    console.log('\n🎯 难度分布:')
    Object.entries(difficultyStats).forEach(([difficulty, count]) => {
      const stars = '★'.repeat(parseInt(difficulty))
      const percentage = ((count / totalCount) * 100).toFixed(1)
      console.log(`  难度${difficulty} ${stars}: ${count} 句 (${percentage}%)`)
    })
    
    this.analysisResults.basic = {
      totalCount,
      levelStats,
      difficultyStats
    }
  }

  /**
   * 分析分类分布情况
   */
  analyzeCategoryDistribution() {
    console.log('\n📋 分类分布分析\n')
    
    const sentences = sentenceService.sentences
    const categories = sentenceService.getAllCategories()
    
    const categoryStats = {}
    categories.forEach(category => {
      const sentencesInCategory = sentenceService.getSentencesByCategory(category)
      categoryStats[category] = {
        count: sentencesInCategory.length,
        percentage: ((sentencesInCategory.length / sentences.length) * 100).toFixed(1),
        sentences: sentencesInCategory
      }
    })
    
    // 按数量排序
    const sortedCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b.count - a.count)
    
    console.log('分类详情 (按数量排序):')
    sortedCategories.forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.count} 句 (${stats.percentage}%)`)
    })
    
    // 识别薄弱分类
    const weakCategories = sortedCategories
      .filter(([, stats]) => stats.count < 3)
      .map(([category]) => category)
    
    if (weakCategories.length > 0) {
      console.log('\n⚠️ 内容薄弱的分类:')
      weakCategories.forEach(category => {
        console.log(`  - ${category} (需要补充内容)`)
      })
    }
    
    this.analysisResults.categories = {
      categoryStats,
      weakCategories,
      totalCategories: categories.length
    }
  }

  /**
   * 分析难度分布合理性
   */
  analyzeDifficultyDistribution() {
    console.log('\n🎯 难度分布合理性分析\n')
    
    const sentences = sentenceService.sentences
    const difficultyAnalysis = {}
    
    // 分析每个难度级别的内容
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      const sentencesAtLevel = sentences.filter(s => s.difficulty === difficulty)
      const avgLength = sentencesAtLevel.reduce((sum, s) => sum + s.content.length, 0) / sentencesAtLevel.length
      
      difficultyAnalysis[difficulty] = {
        count: sentencesAtLevel.length,
        avgLength: avgLength ? avgLength.toFixed(1) : 0,
        examples: sentencesAtLevel.slice(0, 3).map(s => s.content)
      }
    }
    
    console.log('难度级别详细分析:')
    Object.entries(difficultyAnalysis).forEach(([difficulty, analysis]) => {
      console.log(`\n  难度 ${difficulty} (${'★'.repeat(parseInt(difficulty))}):`)
      console.log(`    数量: ${analysis.count} 句`)
      console.log(`    平均长度: ${analysis.avgLength} 字符`)
      console.log(`    示例: "${analysis.examples[0] || 'N/A'}"`)
    })
    
    // 分析难度分布是否合理
    const idealDistribution = { 1: 50, 2: 35, 3: 15 } // 理想百分比
    const actualDistribution = {}
    
    Object.entries(difficultyAnalysis).forEach(([difficulty, analysis]) => {
      actualDistribution[difficulty] = ((analysis.count / sentences.length) * 100).toFixed(1)
    })
    
    console.log('\n📊 难度分布对比:')
    Object.entries(idealDistribution).forEach(([difficulty, ideal]) => {
      const actual = actualDistribution[difficulty] || 0
      const status = Math.abs(actual - ideal) < 10 ? '✅' : '⚠️'
      console.log(`  难度${difficulty}: 实际${actual}% vs 理想${ideal}% ${status}`)
    })
    
    this.analysisResults.difficulty = {
      difficultyAnalysis,
      idealDistribution,
      actualDistribution
    }
  }

  /**
   * 分析内容质量
   */
  analyzeContentQuality() {
    console.log('\n🔍 内容质量分析\n')
    
    const sentences = sentenceService.sentences
    
    // 分析句子长度分布
    const lengthStats = {
      short: sentences.filter(s => s.content.length < 15).length,
      medium: sentences.filter(s => s.content.length >= 15 && s.content.length < 30).length,
      long: sentences.filter(s => s.content.length >= 30).length
    }
    
    // 分析常用词汇覆盖
    const allWords = sentences.flatMap(s => s.content.toLowerCase().split(/\s+/))
    const wordFrequency = {}
    allWords.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
      if (cleanWord.length > 2) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1
      }
    })
    
    const topWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
    
    // 分析语法结构多样性
    const questionCount = sentences.filter(s => s.content.includes('?')).length
    const statementCount = sentences.filter(s => !s.content.includes('?') && !s.content.includes('!')).length
    const exclamationCount = sentences.filter(s => s.content.includes('!')).length
    
    console.log('句子长度分布:')
    console.log(`  短句 (<15字符): ${lengthStats.short} 句`)
    console.log(`  中等 (15-30字符): ${lengthStats.medium} 句`)
    console.log(`  长句 (>30字符): ${lengthStats.long} 句`)
    
    console.log('\n高频词汇 (Top 10):')
    topWords.forEach(([word, freq], index) => {
      console.log(`  ${index + 1}. "${word}" (${freq}次)`)
    })
    
    console.log('\n语法结构分布:')
    console.log(`  疑问句: ${questionCount} 句`)
    console.log(`  陈述句: ${statementCount} 句`)
    console.log(`  感叹句: ${exclamationCount} 句`)
    
    this.analysisResults.quality = {
      lengthStats,
      topWords,
      grammarStats: { questionCount, statementCount, exclamationCount }
    }
  }

  /**
   * 生成语料库扩展计划
   */
  generateExpansionPlan() {
    console.log('\n🚀 语料库扩展计划\n')
    
    const { categories, difficulty, quality } = this.analysisResults
    
    // 扩展目标
    const expansionGoals = {
      totalTarget: 100, // 目标总数100句
      newSentencesNeeded: 100 - sentenceService.sentences.length,
      priorityAreas: []
    }
    
    // 识别优先扩展领域
    if (categories.weakCategories.length > 0) {
      expansionGoals.priorityAreas.push({
        type: 'category',
        items: categories.weakCategories,
        reason: '分类内容不足'
      })
    }
    
    // 难度分布优化
    const difficultyGaps = []
    Object.entries(difficulty.idealDistribution).forEach(([level, ideal]) => {
      const actual = parseFloat(difficulty.actualDistribution[level] || 0)
      if (actual < ideal - 5) {
        difficultyGaps.push({
          level: parseInt(level),
          gap: ideal - actual,
          needed: Math.ceil((ideal - actual) * expansionGoals.totalTarget / 100)
        })
      }
    })
    
    if (difficultyGaps.length > 0) {
      expansionGoals.priorityAreas.push({
        type: 'difficulty',
        items: difficultyGaps,
        reason: '难度分布不均'
      })
    }
    
    console.log(`扩展目标: 从 ${sentenceService.sentences.length} 句扩展到 ${expansionGoals.totalTarget} 句`)
    console.log(`需要新增: ${expansionGoals.newSentencesNeeded} 句\n`)
    
    console.log('优先扩展领域:')
    expansionGoals.priorityAreas.forEach((area, index) => {
      console.log(`\n${index + 1}. ${area.reason}:`)
      if (area.type === 'category') {
        area.items.forEach(category => {
          console.log(`   - 补充"${category}"分类内容 (建议新增5-8句)`)
        })
      } else if (area.type === 'difficulty') {
        area.items.forEach(gap => {
          console.log(`   - 难度${gap.level}需要新增${gap.needed}句 (当前缺口${gap.gap.toFixed(1)}%)`)
        })
      }
    })
    
    this.expansionPlan = expansionGoals
  }

  /**
   * 创建实施路线图
   */
  createImplementationRoadmap() {
    console.log('\n📅 扩展实施路线图\n')
    
    const phases = [
      {
        phase: 'Phase 1: 基础补强',
        duration: '1-2天',
        tasks: [
          '补充薄弱分类内容 (商务、技术、健康等)',
          '增加中级难度句子 (目标20句)',
          '完善日常对话场景'
        ],
        deliverables: '新增25句，达到50句总量'
      },
      {
        phase: 'Phase 2: 场景扩展',
        duration: '2-3天',
        tasks: [
          '新增专业场景 (面试、会议、旅游)',
          '增加高级难度句子 (目标15句)',
          '丰富语法结构多样性'
        ],
        deliverables: '新增30句，达到80句总量'
      },
      {
        phase: 'Phase 3: 质量优化',
        duration: '1-2天',
        tasks: [
          '内容质量审核和优化',
          '最后20句精品内容',
          '建立内容更新机制'
        ],
        deliverables: '新增20句，达到100句目标'
      }
    ]
    
    phases.forEach((phase, index) => {
      console.log(`${phase.phase} (${phase.duration}):`)
      console.log(`  目标: ${phase.deliverables}`)
      console.log('  任务:')
      phase.tasks.forEach(task => {
        console.log(`    - ${task}`)
      })
      console.log('')
    })
    
    console.log('📊 预期成果:')
    console.log('  • 语料库规模: 25句 → 100句 (4倍增长)')
    console.log('  • 分类覆盖: 13个 → 20个 (更全面)')
    console.log('  • 难度分布: 优化至理想比例')
    console.log('  • 内容质量: 专业级别语料库')
    
    console.log('\n⏱️ 总开发时间: 4-7天')
    console.log('🎯 里程碑: 建成小程序级别的专业语料库')
  }

  /**
   * 生成具体的新增内容建议
   */
  generateContentSuggestions() {
    console.log('\n💡 新增内容建议\n')
    
    const suggestions = {
      商务: [
        "I'd like to schedule a meeting for next week.",
        "Could you please send me the quarterly report?",
        "Let's discuss this proposal in detail.",
        "I need to confirm the budget allocation.",
        "The deadline for this project is approaching."
      ],
      技术: [
        "I'm having trouble with my computer.",
        "Can you help me install this software?",
        "The system needs to be updated regularly.",
        "Let's backup the important data first.",
        "The network connection seems unstable."
      ],
      健康: [
        "I need to make a doctor's appointment.",
        "It's important to exercise regularly.",
        "I've been feeling tired lately.",
        "A balanced diet is essential for health.",
        "I should get more sleep at night."
      ],
      旅游: [
        "How do I get to the nearest subway station?",
        "I'd like to book a hotel room for tonight.",
        "What time does the museum close?",
        "Can you recommend a good local restaurant?",
        "I need to exchange some currency."
      ]
    }
    
    Object.entries(suggestions).forEach(([category, sentences]) => {
      console.log(`${category}分类建议 (${sentences.length}句):`)
      sentences.forEach((sentence, index) => {
        console.log(`  ${index + 1}. "${sentence}"`)
      })
      console.log('')
    })
  }
}

// 运行分析
if (typeof module !== 'undefined' && require.main === module) {
  const analyzer = new SentenceLibraryAnalyzer()
  analyzer.runFullAnalysis().then(() => {
    analyzer.generateContentSuggestions()
  }).catch(console.error)
}

module.exports = SentenceLibraryAnalyzer 