/**
 * 模拟微信小程序环境
 * 用于在Node.js环境中测试小程序代码
 */

// 模拟wx全局对象
global.wx = {
  getStorageSync: function(key) {
    // 模拟存储，返回默认值
    const mockStorage = {
      'user_preferences': null,
      'practice_history': [],
      'mock_openid': 'mock_user_test_123',
      'device_id': 'mock_device_test_456'
    }
    return mockStorage[key] || null
  },
  
  setStorageSync: function(key, value) {
    // 模拟设置存储
    console.log(`Mock Storage Set: ${key} = ${JSON.stringify(value)}`)
  },
  
  getFileSystemManager: function() {
    return {
      readFile: function(options) {
        // 模拟文件读取失败，触发fallback逻辑
        if (options.fail) {
          options.fail(new Error('Mock file read failure'))
        }
      }
    }
  },
  
  getDeviceInfo: function() {
    return { pixelRatio: 2 }
  },
  
  getAppBaseInfo: function() {
    return { pixelRatio: 2 }
  }
}

// 模拟console（增强版）
const originalConsole = console
global.console = {
  ...originalConsole,
  log: (...args) => {
    // 过滤掉一些干扰信息
    const message = args.join(' ')
    if (!message.includes('Mock Storage') && !message.includes('env: python')) {
      originalConsole.log(...args)
    }
  }
}

module.exports = global.wx 