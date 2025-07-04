const { logService } = require('./services/logService')

//app.js
App({
  onLaunch() {
    const accountInfo = wx.getAccountInfoSync();
    if (accountInfo.miniProgram.envVersion === 'release') {
      logService.setLogLevel('warn');
    } else {
      logService.setLogLevel('debug');
    }
    
    logService.info('App', `小程序启动，环境: ${accountInfo.miniProgram.envVersion}`);
    
    if (wx.cloud) {
      wx.cloud.init({
        env: 'p-word-dev',
        traceUser: true,
      })
    }
    
    try {
      const security = require('./services/security.js')
      
      const sensitiveKeys = ['practice_stats', 'user_config', 'audio_records']
      let cleanedCount = 0
      
      sensitiveKeys.forEach(key => {
        try {
          const stored = wx.getStorageSync(key)
          if (stored && stored.encrypted && stored.data) {
            const decrypted = security.decryptData(stored.data)
            if (!decrypted) {
              wx.removeStorageSync(key)
              cleanedCount++
            }
          }
        } catch (error) {
          try {
            wx.removeStorageSync(key)
            cleanedCount++
          } catch (e) {
          }
        }
      })
      
      security.cleanCorruptedData()
    } catch (error) {
      console.warn('⚠️ 数据清理失败:', error)
    }
    
    this.checkRecordAuth()
    
    this.globalData = {
      recordAuth: false,
      currentSentence: null,
      practiceStats: {
        totalTime: 0,
        sentenceCount: 0,
        lastPracticeDate: null
      }
    }
  },

  checkRecordAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const hasAuth = !!res.authSetting['scope.record']
          this.globalData.recordAuth = hasAuth
          
          if (hasAuth) {
          } else {
          }
          
          resolve(hasAuth)
        },
        fail: (error) => {
          console.error('❌ 权限检查失败:', error)
          this.globalData.recordAuth = false
          resolve(false)
        }
      })
    })
  },

  requestRecordAuth() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          this.globalData.recordAuth = true
          resolve(true)
        },
        fail: () => {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中开启录音权限，以便进行口语练习',
            showCancel: false,
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
          reject(false)
        }
      })
    })
  },

  globalData: {}
}) 