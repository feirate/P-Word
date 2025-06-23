/**
 * P-Word 隐私政策页面
 */

Page({
  data: {
    
  },

  /**
   * 页面加载
   */
  onLoad: function (options) {
    // 记录页面访问
    this.logPageView()
  },

  /**
   * 记录页面访问
   */
  logPageView() {
    try {
      const { logger } = require('../../services/logService.js')
      logger.info('PRIVACY', '用户查看隐私政策')
    } catch (error) {
      console.log('日志记录失败:', error)
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果无法返回，跳转到设置页面
        wx.switchTab({
          url: '/pages/settings/settings'
        })
      }
    })
  },

  /**
   * 接受隐私政策
   */
  acceptPolicy() {
    try {
      // 记录用户同意隐私政策
      wx.setStorageSync('privacy_policy_accepted', {
        accepted: true,
        acceptTime: new Date().toISOString(),
        version: '1.0.0'
      })

      // 记录日志
      const { logger } = require('../../services/logService.js')
      logger.info('PRIVACY', '用户同意隐私政策')

      // 显示成功提示
      wx.showToast({
        title: '感谢您的信任',
        icon: 'success',
        duration: 2000,
        success: () => {
          // 延迟返回上一页
          setTimeout(() => {
            this.goBack()
          }, 1500)
        }
      })

    } catch (error) {
      console.error('保存隐私政策同意状态失败:', error)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      })
    }
  },

  /**
   * 分享隐私政策（可选功能）
   */
  onShareAppMessage() {
    return {
      title: 'P-Word隐私政策 - 保护您的隐私安全',
      path: '/pages/privacy/privacy',
      imageUrl: '/assets/icons/app/share-privacy.png'
    }
  },

  /**
   * 分享到朋友圈（可选功能）
   */
  onShareTimeline() {
    return {
      title: 'P-Word隐私政策 - 透明的隐私保护承诺',
      query: '',
      imageUrl: '/assets/icons/app/share-privacy.png'
    }
  }
}) 