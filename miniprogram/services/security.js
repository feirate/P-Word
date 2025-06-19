/**
 * P-Word 安全服务模块
 * 提供数据加密、输入验证、安全存储等功能
 */

class SecurityService {
  constructor() {
    this.encryptionKey = this.generateKey()
  }

  /**
   * 生成本地加密密钥
   * @returns {string} 加密密钥
   */
  generateKey() {
    // 使用设备唯一标识和时间戳生成密钥
    const systemInfo = wx.getSystemInfoSync()
    const deviceId = systemInfo.model + systemInfo.system + systemInfo.version
    return this.hashString(deviceId + Date.now().toString())
  }

  /**
   * 简单哈希函数
   * @param {string} str 
   * @returns {string}
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 加密敏感数据
   * @param {any} data 待加密数据
   * @returns {string} 加密后的字符串
   */
  encryptData(data) {
    try {
      const jsonStr = JSON.stringify(data)
      // 简单的XOR加密（仅用于本地存储）
      let encrypted = ''
      for (let i = 0; i < jsonStr.length; i++) {
        encrypted += String.fromCharCode(
          jsonStr.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        )
      }
      return btoa(encrypted) // Base64编码
    } catch (error) {
      console.error('数据加密失败:', error)
      return null
    }
  }

  /**
   * 解密数据
   * @param {string} encryptedData 加密的数据
   * @returns {any} 解密后的数据
   */
  decryptData(encryptedData) {
    try {
      const encrypted = atob(encryptedData) // Base64解码
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        )
      }
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('数据解密失败:', error)
      return null
    }
  }

  /**
   * 安全存储数据到本地
   * @param {string} key 存储键
   * @param {any} data 存储数据
   */
  secureStorage(key, data) {
    try {
      // 对敏感数据进行加密存储
      const isSensitive = this.isSensitiveData(key)
      const storeData = isSensitive ? this.encryptData(data) : data
      
      wx.setStorageSync(key, {
        data: storeData,
        encrypted: isSensitive,
        timestamp: Date.now()
      })
      
      console.log(`✅ 安全存储成功: ${key} (加密: ${isSensitive})`)
    } catch (error) {
      console.error('安全存储失败:', error)
    }
  }

  /**
   * 安全读取本地数据
   * @param {string} key 存储键
   * @returns {any} 读取的数据
   */
  secureGet(key) {
    try {
      const stored = wx.getStorageSync(key)
      if (!stored) return null

      if (stored.encrypted) {
        return this.decryptData(stored.data)
      } else {
        return stored.data
      }
    } catch (error) {
      console.error('安全读取失败:', error)
      return null
    }
  }

  /**
   * 判断是否为敏感数据
   * @param {string} key 数据键
   * @returns {boolean}
   */
  isSensitiveData(key) {
    const sensitiveKeys = [
      'practice_stats',
      'user_config',
      'audio_records'
    ]
    return sensitiveKeys.some(sk => key.includes(sk))
  }

  /**
   * 输入验证：过滤恶意内容
   * @param {string} input 用户输入
   * @returns {boolean} 是否安全
   */
  validateInput(input) {
    if (!input || typeof input !== 'string') return false
    
    // 检查恶意脚本
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi
    ]
    
    return !dangerousPatterns.some(pattern => pattern.test(input))
  }

  /**
   * 清理用户输入
   * @param {string} input 用户输入
   * @returns {string} 清理后的输入
   */
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return ''
    
    return input
      .replace(/[<>]/g, '') // 移除尖括号
      .replace(/['"]/g, '') // 移除引号
      .trim() // 去除首尾空格
      .substring(0, 1000) // 限制长度
  }

  /**
   * 生成安全的临时文件名
   * @param {string} extension 文件扩展名
   * @returns {string} 安全的文件名
   */
  generateSecureFileName(extension = '') {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    return `pword_${timestamp}_${random}${extension}`
  }

  /**
   * 清理过期的本地数据
   * @param {number} maxAge 最大存储时间（毫秒）
   */
  cleanExpiredData(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
    try {
      const info = wx.getStorageInfoSync()
      const now = Date.now()
      
      info.keys.forEach(key => {
        try {
          const stored = wx.getStorageSync(key)
          if (stored && stored.timestamp && (now - stored.timestamp) > maxAge) {
            wx.removeStorageSync(key)
            console.log(`🗑️ 清理过期数据: ${key}`)
          }
        } catch (error) {
          // 忽略单个数据清理错误
        }
      })
    } catch (error) {
      console.error('清理过期数据失败:', error)
    }
  }

  /**
   * 数据完整性检查
   * @param {any} data 待检查数据
   * @returns {boolean} 数据是否完整
   */
  checkDataIntegrity(data) {
    if (!data) return false
    
    // 检查必要字段
    const requiredFields = ['timestamp', 'version']
    if (typeof data === 'object') {
      return requiredFields.every(field => data.hasOwnProperty(field))
    }
    
    return true
  }
}

// 创建全局安全服务实例
const securityService = new SecurityService()

// 导出模块
module.exports = securityService 