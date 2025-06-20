//pages.js
const ttsService = require('../../services/ttsService.js')

Page({
  data: {
    // TTS设置
    autoPlayEnabled: true,
    ttsRate: 0.8,
    ttsVolume: 0.9,
    
    // 练习设置
    dailyGoal: 20,
    recommendationMode: 'smart',
    
    // 其他设置
    appVersion: '1.0.0'
  },

  onLoad() {
    console.log('⚙️ 设置页面加载')
    this.loadSettings()
  },

  onShow() {
    // 每次显示时重新加载设置
    this.loadSettings()
  },

  // 加载所有设置
  loadSettings() {
    try {
      // 加载TTS设置
      const autoPlayEnabled = wx.getStorageSync('autoPlayEnabled')
      const ttsRate = wx.getStorageSync('ttsRate') || 0.8
      const ttsVolume = wx.getStorageSync('ttsVolume') || 0.9
      
      // 加载练习设置
      const dailyGoal = wx.getStorageSync('dailyGoal') || 20
      const recommendationMode = wx.getStorageSync('recommendationMode') || 'smart'
      
      this.setData({
        autoPlayEnabled: autoPlayEnabled !== false, // 默认开启
        ttsRate,
        ttsVolume,
        dailyGoal,
        recommendationMode
      })
      
      console.log('✅ 设置加载完成')
      
    } catch (error) {
      console.error('❌ 加载设置失败:', error)
      wx.showToast({
        title: '加载设置失败',
        icon: 'none'
      })
    }
  },

  // 自动朗读开关变化
  onAutoPlayChange(e) {
    const enabled = e.detail.value
    this.setData({ autoPlayEnabled: enabled })
    
    try {
      wx.setStorageSync('autoPlayEnabled', enabled)
      ttsService.setAutoPlay(enabled)
      
      const message = enabled ? '已开启自动朗读' : '已关闭自动朗读'
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 1500
      })
      
      console.log(`⚙️ 自动朗读设置: ${enabled ? '开启' : '关闭'}`)
      
    } catch (error) {
      console.error('❌ 保存自动朗读设置失败:', error)
      // 恢复原状态
      this.setData({ autoPlayEnabled: !enabled })
    }
  },

  // 调整朗读速度
  adjustTTSRate(delta) {
    const newRate = Math.max(0.5, Math.min(2.0, this.data.ttsRate + delta))
    this.setData({ ttsRate: newRate })
    
    try {
      wx.setStorageSync('ttsRate', newRate)
      ttsService.setPlaybackRate(newRate)
      
      wx.showToast({
        title: `速度: ${newRate}x`,
        icon: 'none',
        duration: 1000
      })
      
    } catch (error) {
      console.error('❌ 保存朗读速度失败:', error)
    }
  },

  // 调整朗读音量
  adjustTTSVolume(delta) {
    const newVolume = Math.max(0.0, Math.min(1.0, this.data.ttsVolume + delta))
    this.setData({ ttsVolume: newVolume })
    
    try {
      wx.setStorageSync('ttsVolume', newVolume)
      ttsService.setVolume(newVolume)
      
      wx.showToast({
        title: `音量: ${Math.round(newVolume * 100)}%`,
        icon: 'none',
        duration: 1000
      })
      
    } catch (error) {
      console.error('❌ 保存朗读音量失败:', error)
    }
  },

  // 获取模式文本
  getModeText(mode) {
    const modeTexts = {
      'smart': '智能推荐',
      'sequential': '顺序练习',
      'random': '随机练习',
      'category': '分类练习'
    }
    return modeTexts[mode] || '未知模式'
  },

  // 清除练习数据
  clearPracticeData() {
    wx.showModal({
      title: '确认清除',
      content: '这将删除所有练习记录，包括统计数据和成就记录。此操作不可恢复！',
      confirmText: '确认清除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除相关的存储数据
            const keysToRemove = [
              'practiceStats',
              'practiceStreak', 
              'todayAchievements',
              'sentenceHistory',
              'audioQualityHistory',
              'temp_audio_files'
            ]
            
            keysToRemove.forEach(key => {
              try {
                wx.removeStorageSync(key)
              } catch (e) {
                console.warn(`清除 ${key} 失败:`, e)
              }
            })
            
            wx.showToast({
              title: '数据已清除',
              icon: 'success',
              duration: 2000
            })
            
            console.log('✅ 练习数据已清除')
            
          } catch (error) {
            console.error('❌ 清除数据失败:', error)
            wx.showToast({
              title: '清除失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 导出数据
  exportData() {
    try {
      const exportData = {
        practiceStats: wx.getStorageSync('practiceStats') || {},
        practiceStreak: wx.getStorageSync('practiceStreak') || {},
        settings: {
          autoPlayEnabled: this.data.autoPlayEnabled,
          ttsRate: this.data.ttsRate,
          ttsVolume: this.data.ttsVolume,
          dailyGoal: this.data.dailyGoal,
          recommendationMode: this.data.recommendationMode
        },
        exportTime: new Date().toISOString(),
        version: this.data.appVersion
      }
      
      // 将数据转换为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2)
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: jsonString,
        success: () => {
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success',
            duration: 2000
          })
          
          console.log('✅ 数据导出成功')
        },
        fail: (error) => {
          console.error('❌ 复制到剪贴板失败:', error)
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          })
        }
      })
      
    } catch (error) {
      console.error('❌ 导出数据失败:', error)
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      })
    }
  },

  // 显示关于信息
  showAbout() {
    wx.showModal({
      title: 'P-Word 英语口语练习',
      content: `版本: ${this.data.appVersion}\n\n一款专为中国用户设计的英语口语练习小程序，通过智能语音识别和个性化推荐，帮助用户提升英语口语水平。\n\n特色功能：\n• 智能语音识别\n• 个性化句子推荐\n• 游戏化练习体验\n• 详细的发音分析`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 测试TTS功能
  testTTS() {
    const testText = "Hello, this is a test of the text-to-speech feature."
    
    if (this.data.isTTSPlaying) {
      ttsService.stopCurrent()
      this.setData({ isTTSPlaying: false })
      return
    }
    
    this.setData({ isTTSPlaying: true })
    
    ttsService.playText(testText, {
      rate: this.data.ttsRate,
      volume: this.data.ttsVolume
    }).then((result) => {
      console.log('TTS测试完成:', result)
    }).catch((error) => {
      console.error('TTS测试失败:', error)
      wx.showToast({
        title: 'TTS功能不可用',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ isTTSPlaying: false })
    })
  },

  onUnload() {
    console.log('⚙️ 设置页面卸载')
  }
}) 