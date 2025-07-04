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
    goalOptions: ['5句', '10句', '15句', '20句'],
    goalValues: [5, 10, 15, 20],
    goalIndex: 3, // 默认选择20句
    recommendationMode: 'smart',
    
    // TTS设置 (用于WXML绑定)
    ttsSettings: {
      speed: 0.8,
      pitch: 1.0,
      volume: 0.9,
      autoPlay: true
    },
    
    // 练习设置 (用于WXML绑定)
    practiceSettings: {
      smartRecommend: true,
      avoidRepeats: true
    },
    
    // 其他设置
    version: '1.0.0'
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
      
      // 计算每日目标在选项中的索引
      const goalIndex = this.data.goalValues.indexOf(dailyGoal)
      
      this.setData({
        autoPlayEnabled: autoPlayEnabled !== false, // 默认开启
        ttsRate,
        ttsVolume,
        dailyGoal,
        goalIndex: goalIndex >= 0 ? goalIndex : 3, // 默认20句
        recommendationMode,
        
        // 更新TTS设置对象
        ttsSettings: {
          speed: ttsRate,
          pitch: 1.0,
          volume: ttsVolume,
          autoPlay: autoPlayEnabled !== false
        },
        
        // 更新练习设置对象
        practiceSettings: {
          smartRecommend: recommendationMode === 'smart',
          avoidRepeats: true
        }
      })
      
      console.log('✅ 设置加载完成:', {
        dailyGoal,
        goalIndex: goalIndex >= 0 ? goalIndex : 3,
        autoPlayEnabled: autoPlayEnabled !== false
      })
      
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
        version: this.data.version
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
      content: `版本: ${this.data.version}\n\n一款专为中国用户设计的英语口语练习小程序，通过智能语音识别和个性化推荐，帮助用户提升英语口语水平。\n\n特色功能：\n• 智能语音识别\n• 个性化句子推荐\n• 游戏化练习体验\n• 详细的发音分析`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 每日目标改变
  onGoalChange(e) {
    const goalIndex = parseInt(e.detail.value)
    const dailyGoal = this.data.goalValues[goalIndex]
    
    this.setData({ 
      goalIndex,
      dailyGoal 
    })
    
    try {
      wx.setStorageSync('dailyGoal', dailyGoal)
      
      wx.showToast({
        title: `每日目标设为${dailyGoal}句`,
        icon: 'success',
        duration: 1500
      })
      
      console.log(`⚙️ 每日目标设置: ${dailyGoal}句`)
      
      // 通知主页面更新目标
      const pages = getCurrentPages()
      const indexPage = pages.find(page => page.route === 'pages/index/index')
      if (indexPage && indexPage.updateDailyGoal) {
        indexPage.updateDailyGoal(dailyGoal)
      }
      
    } catch (error) {
      console.error('❌ 保存每日目标失败:', error)
      // 恢复原状态
      const originalIndex = this.data.goalValues.indexOf(wx.getStorageSync('dailyGoal') || 20)
      this.setData({ 
        goalIndex: originalIndex >= 0 ? originalIndex : 3,
        dailyGoal: this.data.goalValues[originalIndex >= 0 ? originalIndex : 3]
      })
      
      wx.showToast({
        title: '设置失败，请重试',
        icon: 'none'
      })
    }
  },

  // TTS速度改变
  onSpeedChange(e) {
    const speed = parseFloat(e.detail.value)
    this.setData({ 
      'ttsSettings.speed': speed,
      ttsRate: speed
    })
    
    try {
      wx.setStorageSync('ttsRate', speed)
      ttsService.setPlaybackRate && ttsService.setPlaybackRate(speed)
      console.log(`⚙️ TTS速度设置: ${speed}x`)
    } catch (error) {
      console.error('❌ 保存TTS速度失败:', error)
    }
  },

  // TTS音调改变
  onPitchChange(e) {
    const pitch = parseFloat(e.detail.value)
    this.setData({ 
      'ttsSettings.pitch': pitch
    })
    
    try {
      wx.setStorageSync('ttsPitch', pitch)
      ttsService.setPitch && ttsService.setPitch(pitch)
      console.log(`⚙️ TTS音调设置: ${pitch}`)
    } catch (error) {
      console.error('❌ 保存TTS音调失败:', error)
    }
  },

  // TTS音量改变
  onVolumeChange(e) {
    const volume = parseFloat(e.detail.value)
    this.setData({ 
      'ttsSettings.volume': volume,
      ttsVolume: volume
    })
    
    try {
      wx.setStorageSync('ttsVolume', volume)
      ttsService.setVolume && ttsService.setVolume(volume)
      console.log(`⚙️ TTS音量设置: ${Math.round(volume * 100)}%`)
    } catch (error) {
      console.error('❌ 保存TTS音量失败:', error)
    }
  },

  // 智能推荐开关改变
  onSmartRecommendChange(e) {
    const enabled = e.detail.value
    this.setData({ 
      'practiceSettings.smartRecommend': enabled,
      recommendationMode: enabled ? 'smart' : 'random'
    })
    
    try {
      wx.setStorageSync('recommendationMode', enabled ? 'smart' : 'random')
      
      wx.showToast({
        title: enabled ? '已开启智能推荐' : '已关闭智能推荐',
        icon: 'success',
        duration: 1500
      })
      
      console.log(`⚙️ 智能推荐设置: ${enabled ? '开启' : '关闭'}`)
    } catch (error) {
      console.error('❌ 保存智能推荐设置失败:', error)
      this.setData({ 'practiceSettings.smartRecommend': !enabled })
    }
  },

  // 避免重复开关改变
  onAvoidRepeatsChange(e) {
    const enabled = e.detail.value
    this.setData({ 
      'practiceSettings.avoidRepeats': enabled
    })
    
    try {
      wx.setStorageSync('avoidRepeats', enabled)
      
      wx.showToast({
        title: enabled ? '已开启避免重复' : '已关闭避免重复',
        icon: 'success',
        duration: 1500
      })
      
      console.log(`⚙️ 避免重复设置: ${enabled ? '开启' : '关闭'}`)
    } catch (error) {
      console.error('❌ 保存避免重复设置失败:', error)
      this.setData({ 'practiceSettings.avoidRepeats': !enabled })
    }
  },

  // 清除历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清除历史',
      content: '这将删除所有练习历史记录，此操作不可恢复！',
      confirmText: '确认清除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          try {
            const keysToRemove = [
              'practice_history',
              'practice_stats'
            ]
            
            keysToRemove.forEach(key => {
              try {
                wx.removeStorageSync(key)
              } catch (e) {
                console.warn(`清除 ${key} 失败:`, e)
              }
            })
            
            wx.showToast({
              title: '历史记录已清除',
              icon: 'success',
              duration: 2000
            })
            
            console.log('✅ 练习历史已清除')
            
          } catch (error) {
            console.error('❌ 清除历史失败:', error)
            wx.showToast({
              title: '清除失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 重置所有设置
  resetSettings() {
    wx.showModal({
      title: '确认重置设置',
      content: '这将恢复所有设置到默认值，此操作不可恢复！',
      confirmText: '确认重置',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除所有设置
            const settingsKeys = [
              'autoPlayEnabled',
              'ttsRate',
              'ttsVolume',
              'ttsPitch',
              'dailyGoal',
              'recommendationMode',
              'avoidRepeats'
            ]
            
            settingsKeys.forEach(key => {
              try {
                wx.removeStorageSync(key)
              } catch (e) {
                console.warn(`重置 ${key} 失败:`, e)
              }
            })
            
            // 重新加载默认设置
            this.setData({
              autoPlayEnabled: true,
              ttsRate: 0.8,
              ttsVolume: 0.9,
              dailyGoal: 20,
              goalIndex: 3,
              recommendationMode: 'smart',
              ttsSettings: {
                speed: 0.8,
                pitch: 1.0,
                volume: 0.9,
                autoPlay: true
              },
              practiceSettings: {
                smartRecommend: true,
                avoidRepeats: true
              }
            })
            
            wx.showToast({
              title: '设置已重置',
              icon: 'success',
              duration: 2000
            })
            
            console.log('✅ 所有设置已重置')
            
          } catch (error) {
            console.error('❌ 重置设置失败:', error)
            wx.showToast({
              title: '重置失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私。本应用仅在您的设备本地存储练习数据，不会上传到服务器。录音数据仅用于本地分析，不会被收集或传输。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题或建议，请通过以下方式联系我们：\n\n微信小程序反馈\n或\n开发者工具 - 意见反馈',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onUnload() {
    console.log('⚙️ 设置页面卸载')
  }
}) 