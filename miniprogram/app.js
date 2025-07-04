const { logService } = require('./services/logService')

//app.js
App({
  onLaunch() {
    console.log('🎙️ P-Word 小程序启动')
    
    // 根据环境设置日志级别
    const accountInfo = wx.getAccountInfoSync();
    if (accountInfo.miniProgram.envVersion === 'release') {
      logService.setLogLevel('warn');
      console.log = () => {}; // 生产环境禁用console.log
      console.debug = () => {};
    } else {
      logService.setLogLevel('debug');
    }
    
    logService.info('App', `小程序启动，环境: ${accountInfo.miniProgram.envVersion}`);
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'p-word-dev',
        traceUser: true,
      })
    }
    
    // 强制清理所有可能损坏的数据（防止加解密错误）
    try {
      const security = require('./services/security.js')
      
      // 强制清理可能损坏的加密数据
      const sensitiveKeys = ['practice_stats', 'user_config', 'audio_records']
      let cleanedCount = 0
      
      sensitiveKeys.forEach(key => {
        try {
          const stored = wx.getStorageSync(key)
          if (stored && stored.encrypted && stored.data) {
            // 尝试解密验证
            const decrypted = security.decryptData(stored.data)
            if (!decrypted) {
              // 解密失败，清理数据
              wx.removeStorageSync(key)
              cleanedCount++
              console.log(`🗑️ 清理损坏数据: ${key}`)
            }
          }
        } catch (error) {
          // 任何错误都清理掉
          try {
            wx.removeStorageSync(key)
            cleanedCount++
            console.log(`🗑️ 清理异常数据: ${key}`)
          } catch (e) {
            // 忽略清理错误
          }
        }
      })
      
      console.log(`🗑️ 强制清理完成，清理了 ${cleanedCount} 个损坏数据`)
      
      // 然后进行常规清理
      security.cleanCorruptedData()
    } catch (error) {
      console.warn('⚠️ 数据清理失败:', error)
    }
    
    // 检查录音权限
    this.checkRecordAuth()
    
    // 初始化全局数据（已移除用户隐私信息收集）
    this.globalData = {
      // 【隐私保护】不收集用户个人信息，仅保留必要的功能状态
      recordAuth: false,
      currentSentence: null,
      practiceStats: {
        totalTime: 0,
        sentenceCount: 0,
        lastPracticeDate: null
      }
    }
  },

  // 检查录音权限
  checkRecordAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const hasAuth = !!res.authSetting['scope.record']
          this.globalData.recordAuth = hasAuth
          
          if (hasAuth) {
            console.log('✅ 录音权限已授权')
          } else {
            console.log('⚠️ 录音权限未授权')
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

  // 申请录音权限
  requestRecordAuth() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          this.globalData.recordAuth = true
          console.log('✅ 录音权限授权成功')
          resolve(true)
        },
        fail: () => {
          console.log('❌ 录音权限授权失败')
          // 引导用户到设置页面
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