/**
 * P-Word 版本信息
 * 用于版本管理和更新提示
 */

const VERSION_INFO = {
  version: '1.0.0',
  buildNumber: 1,
  releaseDate: '2025-06-22',
  stage: 'production',
  features: {
    recording: true,
    smartRecommend: true,
    waveformVisualization: true,
    sentenceLibrary: true,
    practiceHistory: true,
    cloudSync: true,
    ttsPlayback: true
  },
  description: 'P-Word英语口语练习小程序正式版发布 - 专业级口语训练工具',
  changelog: [
    '✨ 智能句子推荐算法 - 900%多样性提升',
    '🎨 现代化游戏风格录音界面 - 视觉体验升级', 
    '📚 40句分级语料库 - 27个场景分类',
    '⚡ 性能优化 - CPU占用减少25%',
    '🛡️ 专业级系统稳定性保障'
  ],
  minWxVersion: '7.0.0',
  compatibility: {
    ios: '10.0+',
    android: '6.0+',
    wechat: '7.0.0+'
  }
}

/**
 * 获取版本信息
 */
function getVersionInfo() {
  return VERSION_INFO
}

/**
 * 检查是否为正式版
 */
function isProduction() {
  return VERSION_INFO.stage === 'production'
}

/**
 * 获取功能特性列表
 */
function getFeatures() {
  return Object.keys(VERSION_INFO.features).filter(
    feature => VERSION_INFO.features[feature]
  )
}

module.exports = {
  VERSION_INFO,
  getVersionInfo,
  isProduction,
  getFeatures
} 