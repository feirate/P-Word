//app.js
App({
  onLaunch() {
    console.log('🎙️ P-Word 小程序启动')
    
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