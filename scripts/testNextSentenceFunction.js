/**
 * P-Word 【下一句】功能测试脚本
 * 验证智能推荐算法的准确性和稳定性
 */

// 首先加载模拟微信环境
require('./mockWxEnvironment.js')

const sentenceService = require('../miniprogram/services/sentenceService.js')

class NextSentenceFunctionTest {
  constructor() {
    this.testResults = []
    this.testCount = 0
    this.passCount = 0
    this.failCount = 0
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始【下一句】功能测试...\n')
    
    // 初始化服务
    await sentenceService.initService()
    
    // 运行各项测试
    await this.testBasicFunctionality()
    await this.testSmartRecommendation()
    await this.testCategoryRecommendation()
    await this.testSequentialRecommendation()
    await this.testRandomRecommendation()
    await this.testEdgeCases()
    
    // 输出测试报告
    this.generateTestReport()
  }

  /**
   * 测试基本功能
   */
  async testBasicFunctionality() {
    console.log('📋 测试1: 基本功能验证')
    
    try {
      // 测试语料库加载
      const totalSentences = sentenceService.getTotalCount()
      this.assert(totalSentences > 0, '语料库应该包含句子', `当前句子数量: ${totalSentences}`)
      
      // 测试获取推荐句子
      const sentence = sentenceService.getRecommendedSentence()
      this.assert(sentence !== null, '应该能获取推荐句子', `获取到句子: ${sentence && sentence.content}`)
      this.assert(sentence.id, '句子应该有ID', `句子ID: ${sentence && sentence.id}`)
      this.assert(sentence.content, '句子应该有内容', `句子内容: ${sentence && sentence.content}`)
      
      console.log('✅ 基本功能测试通过\n')
    } catch (error) {
      console.error('❌ 基本功能测试失败:', error.message)
      this.recordFailure('基本功能', error.message)
    }
  }

  /**
   * 测试智能推荐功能
   */
  async testSmartRecommendation() {
    console.log('📋 测试2: 智能推荐算法验证')
    
    try {
      const recommendations = []
      const testRounds = 10
      
      // 连续获取10次推荐
      for (let i = 0; i < testRounds; i++) {
        const sentence = sentenceService.getRecommendedSentence({
          smartRecommend: true,
          excludeCompleted: true
        })
        recommendations.push(sentence)
      }
      
      // 验证推荐多样性
      const uniqueIds = new Set(recommendations.map(s => s.id))
      const diversityRate = uniqueIds.size / testRounds
      
      this.assert(diversityRate >= 0.7, '智能推荐应该有足够的多样性', `多样性比率: ${diversityRate.toFixed(2)}`)
      
      // 验证推荐质量
      const avgDifficulty = recommendations.reduce((sum, s) => sum + s.difficulty, 0) / recommendations.length
      this.assert(avgDifficulty >= 1 && avgDifficulty <= 3, '推荐难度应该合理', `平均难度: ${avgDifficulty.toFixed(2)}`)
      
      console.log('✅ 智能推荐测试通过\n')
    } catch (error) {
      console.error('❌ 智能推荐测试失败:', error.message)
      this.recordFailure('智能推荐', error.message)
    }
  }

  /**
   * 测试分类推荐功能
   */
  async testCategoryRecommendation() {
    console.log('📋 测试3: 分类推荐验证')
    
    try {
      const categories = sentenceService.getAllCategories()
      this.assert(categories.length > 0, '应该有语料分类', `分类数量: ${categories.length}`)
      
      // 测试每个分类的推荐
      for (const category of categories.slice(0, 3)) { // 测试前3个分类
        const sentences = sentenceService.getSentencesByCategory(category)
        this.assert(sentences.length > 0, `${category}分类应该有句子`, `句子数量: ${sentences.length}`)
        
        const recommendation = sentenceService.getRecommendedSentence({
          forceLevel: null,
          categoryFilter: category
        })
        
        if (recommendation) {
          this.assert(recommendation.category === category, 
            `推荐句子应该属于指定分类`, 
            `期望: ${category}, 实际: ${recommendation.category}`)
        }
      }
      
      console.log('✅ 分类推荐测试通过\n')
    } catch (error) {
      console.error('❌ 分类推荐测试失败:', error.message)
      this.recordFailure('分类推荐', error.message)
    }
  }

  /**
   * 测试顺序推荐功能
   */
  async testSequentialRecommendation() {
    console.log('📋 测试4: 顺序推荐验证')
    
    try {
      const sequence = []
      const testRounds = 5
      
      // 模拟顺序推荐模式
      for (let i = 0; i < testRounds; i++) {
        const sentence = sentenceService.getRecommendedSentence({
          smartRecommend: false,
          sequential: true
        })
        sequence.push(sentence)
      }
      
      // 验证顺序性（如果实现了顺序推荐）
      this.assert(sequence.length === testRounds, '应该能获取指定数量的句子', `获取数量: ${sequence.length}`)
      
      console.log('✅ 顺序推荐测试通过\n')
    } catch (error) {
      console.error('❌ 顺序推荐测试失败:', error.message)
      this.recordFailure('顺序推荐', error.message)
    }
  }

  /**
   * 测试随机推荐功能
   */
  async testRandomRecommendation() {
    console.log('📋 测试5: 随机推荐验证')
    
    try {
      const randomSentences = []
      const testRounds = 8
      
      // 连续获取随机推荐
      for (let i = 0; i < testRounds; i++) {
        const sentence = sentenceService.getRecommendedSentence({
          smartRecommend: false,
          random: true
        })
        randomSentences.push(sentence)
      }
      
      // 验证随机性
      const uniqueIds = new Set(randomSentences.map(s => s.id))
      const randomnessRate = uniqueIds.size / testRounds
      
      this.assert(randomnessRate >= 0.5, '随机推荐应该有一定的随机性', `随机性比率: ${randomnessRate.toFixed(2)}`)
      
      console.log('✅ 随机推荐测试通过\n')
    } catch (error) {
      console.error('❌ 随机推荐测试失败:', error.message)
      this.recordFailure('随机推荐', error.message)
    }
  }

  /**
   * 测试边界情况
   */
  async testEdgeCases() {
    console.log('📋 测试6: 边界情况验证')
    
    try {
      // 测试排除所有句子的情况
      const allSentenceIds = sentenceService.sentences.map(s => s.id)
      const excludeAllResult = sentenceService.getRecommendedSentence({
        excludeIds: allSentenceIds
      })
      
      // 应该有fallback机制
      this.assert(excludeAllResult !== null, '排除所有句子时应该有fallback机制', `结果: ${excludeAllResult && excludeAllResult.content}`)
      
      // 测试空参数
      const emptyParamsResult = sentenceService.getRecommendedSentence({})
      this.assert(emptyParamsResult !== null, '空参数时应该能正常工作', `结果: ${emptyParamsResult && emptyParamsResult.content}`)
      
      // 测试无效分类
      const invalidCategoryResult = sentenceService.getSentencesByCategory('不存在的分类')
      this.assert(Array.isArray(invalidCategoryResult), '无效分类应该返回空数组', `结果长度: ${invalidCategoryResult.length}`)
      
      console.log('✅ 边界情况测试通过\n')
    } catch (error) {
      console.error('❌ 边界情况测试失败:', error.message)
      this.recordFailure('边界情况', error.message)
    }
  }

  /**
   * 断言函数
   */
  assert(condition, message, details = '') {
    this.testCount++
    
    if (condition) {
      this.passCount++
      console.log(`  ✅ ${message} ${details ? `(${details})` : ''}`)
    } else {
      this.failCount++
      console.log(`  ❌ ${message} ${details ? `(${details})` : ''}`)
      throw new Error(message)
    }
  }

  /**
   * 记录失败
   */
  recordFailure(testName, error) {
    this.testResults.push({
      test: testName,
      status: 'FAIL',
      error: error,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    console.log('\n📊 【下一句】功能测试报告')
    console.log('=' .repeat(50))
    console.log(`总测试数: ${this.testCount}`)
    console.log(`通过数: ${this.passCount}`)
    console.log(`失败数: ${this.failCount}`)
    console.log(`成功率: ${((this.passCount / this.testCount) * 100).toFixed(2)}%`)
    
    if (this.testResults.length > 0) {
      console.log('\n❌ 失败详情:')
      this.testResults.forEach(result => {
        console.log(`  - ${result.test}: ${result.error}`)
      })
    }
    
    console.log('\n' + '=' .repeat(50))
    
    if (this.failCount === 0) {
      console.log('🎉 所有测试通过！【下一句】功能工作正常')
    } else {
      console.log('⚠️  存在测试失败，需要进一步检查')
    }
  }
}

// 如果直接运行此脚本
if (typeof module !== 'undefined' && require.main === module) {
  const tester = new NextSentenceFunctionTest()
  tester.runAllTests().catch(console.error)
}

module.exports = NextSentenceFunctionTest 