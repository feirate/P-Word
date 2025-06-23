/**
 * P-Word 预发布检查脚本
 * 验证项目是否准备好发布
 */

// 加载模拟微信环境
require('./mockWxEnvironment.js')

const fs = require('fs')
const path = require('path')

class PreReleaseChecker {
  constructor() {
    this.errors = []
    this.warnings = []
    this.passed = []
  }

  /**
   * 运行完整的预发布检查
   */
  async runFullCheck() {
    console.log('🔍 P-Word 预发布检查\n')
    console.log('=' .repeat(60))
    
    // 执行各项检查
    this.checkProjectConfig()
    this.checkAppConfig()
    this.checkVersionInfo()
    await this.checkCoreServices()
    this.checkFileStructure()
    this.checkPrivacyPolicy()
    this.checkAssets()
    this.checkCodeQuality()
    
    // 生成检查报告
    this.generateReport()
  }

  /**
   * 检查项目配置
   */
  checkProjectConfig() {
    console.log('\n📋 检查项目配置')
    
    try {
      const projectConfig = JSON.parse(fs.readFileSync('project.config.json', 'utf8'))
      
      // 检查AppID
      if (projectConfig.appid && projectConfig.appid !== 'touristappid') {
        this.passed.push('✅ AppID配置正确')
      } else {
        this.errors.push('❌ AppID未配置或为测试ID')
      }
      
      // 检查URL检查开启
      if (projectConfig.setting.urlCheck) {
        this.passed.push('✅ URL检查已启用')
      } else {
        this.warnings.push('⚠️ 建议启用URL检查')
      }
      
      // 检查SourceMap上传关闭
      if (!projectConfig.setting.uploadWithSourceMap) {
        this.passed.push('✅ SourceMap上传已关闭')
      } else {
        this.warnings.push('⚠️ 建议关闭SourceMap上传')
      }
      
      // 检查项目名称
      if (projectConfig.projectname && projectConfig.projectname.includes('P-Word')) {
        this.passed.push('✅ 项目名称规范')
      } else {
        this.warnings.push('⚠️ 项目名称建议包含P-Word')
      }
      
    } catch (error) {
      this.errors.push('❌ project.config.json读取失败: ' + error.message)
    }
  }

  /**
   * 检查应用配置
   */
  checkAppConfig() {
    console.log('\n📋 检查应用配置')
    
    try {
      const appConfig = JSON.parse(fs.readFileSync('miniprogram/app.json', 'utf8'))
      
      // 检查页面配置
      const requiredPages = ['pages/index/index', 'pages/library/library', 'pages/history/history', 'pages/settings/settings']
      const missingPages = requiredPages.filter(page => !appConfig.pages.includes(page))
      
      if (missingPages.length === 0) {
        this.passed.push('✅ 页面配置完整')
      } else {
        this.errors.push('❌ 缺少页面: ' + missingPages.join(', '))
      }
      
      // 检查TabBar配置
      if (appConfig.tabBar && appConfig.tabBar.list && appConfig.tabBar.list.length >= 4) {
        this.passed.push('✅ TabBar配置完整')
      } else {
        this.errors.push('❌ TabBar配置不完整')
      }
      
      // 检查权限配置
      if (appConfig.permission && appConfig.permission['scope.record']) {
        this.passed.push('✅ 录音权限说明完整')
      } else {
        this.errors.push('❌ 缺少录音权限说明')
      }
      
    } catch (error) {
      this.errors.push('❌ app.json读取失败: ' + error.message)
    }
  }

  /**
   * 检查版本信息
   */
  checkVersionInfo() {
    console.log('\n📋 检查版本信息')
    
    try {
      const versionInfo = require('../miniprogram/version.js')
      
      if (versionInfo.VERSION_INFO.version) {
        this.passed.push('✅ 版本号配置正确: ' + versionInfo.VERSION_INFO.version)
      } else {
        this.errors.push('❌ 版本号未配置')
      }
      
      if (versionInfo.VERSION_INFO.stage === 'production') {
        this.passed.push('✅ 版本状态为生产环境')
      } else {
        this.warnings.push('⚠️ 版本状态不是生产环境')
      }
      
      if (versionInfo.VERSION_INFO.description) {
        this.passed.push('✅ 版本描述完整')
      } else {
        this.warnings.push('⚠️ 建议添加版本描述')
      }
      
    } catch (error) {
      this.errors.push('❌ version.js读取失败: ' + error.message)
    }
  }

  /**
   * 检查核心服务
   */
  async checkCoreServices() {
    console.log('\n📋 检查核心服务')
    
    try {
      // 检查语料库服务
      const sentenceService = require('../miniprogram/services/sentenceService.js')
      await sentenceService.initService()
      
      const totalSentences = sentenceService.getTotalCount()
      if (totalSentences >= 25) {
        this.passed.push(`✅ 语料库数量充足: ${totalSentences}句`)
      } else {
        this.warnings.push(`⚠️ 语料库数量偏少: ${totalSentences}句`)
      }
      
      const categories = sentenceService.getAllCategories()
      if (categories.length >= 10) {
        this.passed.push(`✅ 分类数量充足: ${categories.length}个`)
      } else {
        this.warnings.push(`⚠️ 分类数量偏少: ${categories.length}个`)
      }
      
      // 检查推荐功能
      const recommended = sentenceService.getRecommendedSentence()
      if (recommended && recommended.content) {
        this.passed.push('✅ 推荐算法正常')
      } else {
        this.errors.push('❌ 推荐算法异常')
      }
      
    } catch (error) {
      this.errors.push('❌ 语料库服务检查失败: ' + error.message)
    }
    
    try {
      // 检查日志服务
      const { logger } = require('../miniprogram/services/logService.js')
      logger.info('TEST', '预发布检查')
      this.passed.push('✅ 日志服务正常')
    } catch (error) {
      this.errors.push('❌ 日志服务异常: ' + error.message)
    }
    
    try {
      // 检查安全服务
      const security = require('../miniprogram/services/security.js')
      security.generateKey()
      this.passed.push('✅ 安全服务正常')
    } catch (error) {
      this.errors.push('❌ 安全服务异常: ' + error.message)
    }
  }

  /**
   * 检查文件结构
   */
  checkFileStructure() {
    console.log('\n📋 检查文件结构')
    
    const requiredFiles = [
      'miniprogram/app.js',
      'miniprogram/app.json',
      'miniprogram/app.wxss',
      'miniprogram/pages/index/index.js',
      'miniprogram/pages/library/library.js',
      'miniprogram/pages/history/history.js',
      'miniprogram/pages/settings/settings.js',
      'miniprogram/pages/privacy/privacy.js',
      'miniprogram/services/sentenceService.js',
      'miniprogram/services/audioService.js',
      'miniprogram/services/security.js',
      'miniprogram/services/logService.js',
      'miniprogram/sitemap.json'
    ]
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file))
    
    if (missingFiles.length === 0) {
      this.passed.push('✅ 核心文件结构完整')
    } else {
      this.errors.push('❌ 缺少核心文件: ' + missingFiles.join(', '))
    }
    
    // 检查资源文件
    if (fs.existsSync('miniprogram/assets')) {
      this.passed.push('✅ 资源目录存在')
    } else {
      this.warnings.push('⚠️ 缺少资源目录')
    }
  }

  /**
   * 检查隐私政策
   */
  checkPrivacyPolicy() {
    console.log('\n📋 检查隐私政策')
    
    if (fs.existsSync('miniprogram/pages/privacy/privacy.js')) {
      this.passed.push('✅ 隐私政策页面存在')
    } else {
      this.errors.push('❌ 缺少隐私政策页面')
    }
    
    try {
      const privacyWxml = fs.readFileSync('miniprogram/pages/privacy/privacy.wxml', 'utf8')
      if (privacyWxml.includes('隐私政策') || privacyWxml.includes('数据处理')) {
        this.passed.push('✅ 隐私政策内容存在')
      } else {
        this.warnings.push('⚠️ 隐私政策内容可能不完整')
      }
    } catch (error) {
      this.warnings.push('⚠️ 无法读取隐私政策内容')
    }
  }

  /**
   * 检查资源文件
   */
  checkAssets() {
    console.log('\n📋 检查资源文件')
    
    // 检查图标文件
    const iconPaths = [
      'miniprogram/assets/icons/tabbar',
      'miniprogram/assets/icons/app'
    ]
    
    iconPaths.forEach(iconPath => {
      if (fs.existsSync(iconPath)) {
        this.passed.push(`✅ 图标目录存在: ${iconPath}`)
      } else {
        this.warnings.push(`⚠️ 图标目录缺失: ${iconPath}`)
      }
    })
    
    // 检查语料库文件
    if (fs.existsSync('miniprogram/assets/sentences')) {
      this.passed.push('✅ 语料库资源目录存在')
    } else {
      this.warnings.push('⚠️ 语料库资源目录缺失')
    }
  }

  /**
   * 检查代码质量
   */
  checkCodeQuality() {
    console.log('\n📋 检查代码质量')
    
    // 检查调试代码
    const jsFiles = this.findJSFiles('miniprogram/')
    let hasDebugCode = false
    
    jsFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8')
        if (content.includes('console.debug') || content.includes('debugger')) {
          hasDebugCode = true
        }
      } catch (error) {
        // 忽略读取错误
      }
    })
    
    if (!hasDebugCode) {
      this.passed.push('✅ 无明显调试代码')
    } else {
      this.warnings.push('⚠️ 检测到可能的调试代码')
    }
    
    // 检查文件大小
    const totalSize = this.calculateTotalSize('miniprogram/')
    if (totalSize < 10 * 1024 * 1024) { // 10MB
      this.passed.push(`✅ 代码包大小合理: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
    } else {
      this.warnings.push(`⚠️ 代码包较大: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
    }
  }

  /**
   * 查找JS文件
   */
  findJSFiles(dir) {
    const files = []
    
    function walk(currentDir) {
      const items = fs.readdirSync(currentDir)
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          walk(fullPath)
        } else if (item.endsWith('.js')) {
          files.push(fullPath)
        }
      })
    }
    
    try {
      walk(dir)
    } catch (error) {
      // 忽略目录读取错误
    }
    
    return files
  }

  /**
   * 计算总文件大小
   */
  calculateTotalSize(dir) {
    let totalSize = 0
    
    function walk(currentDir) {
      try {
        const items = fs.readdirSync(currentDir)
        
        items.forEach(item => {
          const fullPath = path.join(currentDir, item)
          const stat = fs.statSync(fullPath)
          
          if (stat.isDirectory()) {
            walk(fullPath)
          } else {
            totalSize += stat.size
          }
        })
      } catch (error) {
        // 忽略目录读取错误
      }
    }
    
    walk(dir)
    return totalSize
  }

  /**
   * 生成检查报告
   */
  generateReport() {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 预发布检查报告')
    
    console.log('\n✅ 通过的检查项:')
    this.passed.forEach(item => console.log('  ' + item))
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ 警告项:')
      this.warnings.forEach(item => console.log('  ' + item))
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误项:')
      this.errors.forEach(item => console.log('  ' + item))
    }
    
    console.log('\n📈 检查统计:')
    console.log(`  通过: ${this.passed.length} 项`)
    console.log(`  警告: ${this.warnings.length} 项`)
    console.log(`  错误: ${this.errors.length} 项`)
    
    const readyForRelease = this.errors.length === 0
    
    console.log('\n' + '=' .repeat(60))
    if (readyForRelease) {
      console.log('🎉 预发布检查通过！项目已准备好发布')
      console.log('📋 下一步：使用微信开发者工具上传代码')
    } else {
      console.log('🔧 发现问题需要修复后再发布')
      console.log('💡 建议：修复所有错误项后重新运行检查')
    }
    
    return readyForRelease
  }
}

// 运行检查
if (require.main === module) {
  const checker = new PreReleaseChecker()
  checker.runFullCheck().then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('检查过程中发生错误:', error)
    process.exit(1)
  })
}

module.exports = PreReleaseChecker 