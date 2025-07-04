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
    try {
      // 检查微信环境是否可用
      if (typeof wx === 'undefined') {
        console.warn('⚠️ 非微信小程序环境，使用默认密钥')
        return this.hashString('default-key' + Date.now().toString())
      }

      // 使用新的API获取设备信息
      const deviceInfo = (wx.getDeviceInfo && wx.getDeviceInfo()) || {}
      const appInfo = (wx.getAppBaseInfo && wx.getAppBaseInfo()) || {}
      const deviceId = (deviceInfo.model || 'unknown') + 
                      (deviceInfo.system || appInfo.platform || 'unknown') + 
                      (appInfo.version || '1.0.0')
      return this.hashString(deviceId + Date.now().toString())
    } catch (error) {
      console.warn('⚠️ 生成加密密钥失败，使用默认密钥:', error)
      return this.hashString('fallback-key' + Date.now().toString())
    }
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
   * Base64编码（微信小程序兼容版）
   * @param {string} str 待编码字符串
   * @returns {string} Base64编码后的字符串
   */
  base64Encode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    while (i < str.length) {
      const a = str.charCodeAt(i++)
      const b = i < str.length ? str.charCodeAt(i++) : 0
      const c = i < str.length ? str.charCodeAt(i++) : 0
      
      const bitmap = (a << 16) | (b << 8) | c
      result += chars.charAt((bitmap >> 18) & 63)
      result += chars.charAt((bitmap >> 12) & 63)
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '='
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '='
    }
    
    return result
  }

  /**
   * Base64解码（微信小程序兼容版）
   * @param {string} str Base64编码的字符串
   * @returns {string} 解码后的字符串
   */
  base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    // 移除非Base64字符
    str = str.replace(/[^A-Za-z0-9+/]/g, '')
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++))
      const encoded2 = chars.indexOf(str.charAt(i++))
      const encoded3 = chars.indexOf(str.charAt(i++))
      const encoded4 = chars.indexOf(str.charAt(i++))
      
      // 检查是否有无效字符
      if (encoded1 === -1 || encoded2 === -1) break
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | 
                    ((encoded3 !== -1 ? encoded3 : 0) << 6) | 
                    (encoded4 !== -1 ? encoded4 : 0)
      
      result += String.fromCharCode((bitmap >> 16) & 255)
      
      if (encoded3 !== -1) {
        result += String.fromCharCode((bitmap >> 8) & 255)
      }
      if (encoded4 !== -1) {
        result += String.fromCharCode(bitmap & 255)
      }
    }
    
    return result
  }

  /**
   * 加密敏感数据（修复版）
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
      return this.base64Encode(encrypted) // 使用自定义Base64编码
    } catch (error) {
      console.error('数据加密失败:', error)
      return null
    }
  }

  /**
   * 解密数据（增强版 - 修复所有问题）
   * @param {string} encryptedData 加密的数据
   * @returns {any} 解密后的数据
   */
  decryptData(encryptedData) {
    try {
      // 1. 验证输入数据
      if (!encryptedData || typeof encryptedData !== 'string') {
        console.warn('⚠️ 无效的加密数据格式')
        return null
      }

      if (encryptedData.length === 0) {
        console.warn('⚠️ 加密数据为空')
        return null
      }

      // 2. Base64解码验证
      const encrypted = this.base64Decode(encryptedData)
      if (!encrypted || encrypted.length === 0) {
        console.warn('⚠️ Base64解码失败或结果为空')
        return null
      }

      // 3. XOR解密
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i)
        const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        decrypted += String.fromCharCode(encryptedChar ^ keyChar)
      }

      // 4. 验证解密后的数据
      if (!decrypted || decrypted.length === 0) {
        console.warn('⚠️ 解密后数据为空')
        return null
      }

      // 5. 验证是否看起来像JSON
      if (!decrypted.startsWith('{') && !decrypted.startsWith('[')) {
        console.warn('⚠️ 解密后数据不像JSON格式')
        return null
      }

      // 6. 尝试解析JSON
      const parsed = JSON.parse(decrypted)
      return parsed
    } catch (error) {
      console.error('数据解密失败:', {
        error: error.message,
        stack: error.stack,
        dataLength: encryptedData ? encryptedData.length : 0,
        dataPreview: encryptedData ? encryptedData.substring(0, 50) + '...' : 'null'
      })
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
      // 检查微信环境
      if (typeof wx === 'undefined') {
        console.warn('⚠️ 非微信小程序环境，跳过存储')
        return
      }

      // 对敏感数据进行加密存储
      const isSensitive = this.isSensitiveData(key)
      const storeData = isSensitive ? this.encryptData(data) : data
      
      wx.setStorageSync(key, {
        data: storeData,
        encrypted: isSensitive,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('安全存储失败:', error)
    }
  }

  /**
   * 安全读取本地数据（增强版）
   * @param {string} key 存储键
   * @returns {any} 读取的数据
   */
  secureGet(key) {
    try {
      // 检查微信环境
      if (typeof wx === 'undefined') {
        console.warn('⚠️ 非微信小程序环境，返回null')
        return null
      }

      const stored = wx.getStorageSync(key)
      if (!stored) return null

      // 如果数据格式不正确，清理并返回null
      if (typeof stored !== 'object' || !stored.hasOwnProperty('encrypted')) {
        console.warn(`⚠️ 数据格式错误，清理数据: ${key}`)
        wx.removeStorageSync(key)
        return null
      }

      if (stored.encrypted) {
        // 验证加密数据是否有效
        if (!stored.data || typeof stored.data !== 'string') {
          console.warn(`⚠️ 加密数据无效，清理数据: ${key}`)
          wx.removeStorageSync(key)
          return null
        }

        const decrypted = this.decryptData(stored.data)
        if (decrypted === null) {
          // 解密失败，清除损坏的数据
          console.warn(`⚠️ 数据解密失败，清除损坏数据: ${key}`)
          wx.removeStorageSync(key)
          return null
        }
        return decrypted
      } else {
        return stored.data
      }
    } catch (error) {
      console.error('安全读取失败:', {
        key,
        error: error.message,
        stack: error.stack
      })
      // 清除有问题的数据
      try {
        if (typeof wx !== 'undefined') {
          wx.removeStorageSync(key)
        }
      } catch (e) {
        // 忽略清除错误
      }
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
   * 生成安全的唯一ID
   * @param {string} prefix ID前缀
   * @returns {string} 唯一ID
   */
  generateSecureId(prefix = 'id') {
    const timestamp = Date.now().toString(36)
    const random1 = Math.random().toString(36).substring(2, 8)
    const random2 = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random1}${random2}`
  }

  /**
   * 清理过期的本地数据
   * @param {number} maxAge 最大存储时间（毫秒）
   */
  cleanExpiredData(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
    try {
      // 检查微信环境
      if (typeof wx === 'undefined') {
        console.warn('⚠️ 非微信小程序环境，跳过数据清理')
        return
      }

      const info = wx.getStorageInfoSync()
      const now = Date.now()
      
      info.keys.forEach(key => {
        try {
          const stored = wx.getStorageSync(key)
          if (stored && stored.timestamp && (now - stored.timestamp) > maxAge) {
            wx.removeStorageSync(key)
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
   * 清理损坏的本地数据
   */
  cleanCorruptedData() {
    try {
      // 检查微信环境
      if (typeof wx === 'undefined') {
        console.warn('⚠️ 非微信小程序环境，跳过数据清理')
        return
      }

      const info = wx.getStorageInfoSync()
      let cleanedCount = 0
      
      info.keys.forEach(key => {
        try {
          const stored = wx.getStorageSync(key)
          
          // 检查是否为我们的数据格式
          if (stored && typeof stored === 'object' && stored.hasOwnProperty('encrypted')) {
            // 如果是加密数据，尝试解密验证
            if (stored.encrypted && stored.data) {
              const decrypted = this.decryptData(stored.data)
              if (decrypted === null) {
                console.warn(`🗑️ 清理损坏的加密数据: ${key}`)
                wx.removeStorageSync(key)
                cleanedCount++
              }
            }
          }
        } catch (error) {
          // 如果读取或解析出错，删除这个存储项
          console.warn(`🗑️ 清理无法访问的数据: ${key}`, error.message)
          try {
            wx.removeStorageSync(key)
            cleanedCount++
          } catch (e) {
            // 忽略删除错误
          }
        }
      })
      
      if (cleanedCount > 0) {
        console.warn(`✅ 清理了 ${cleanedCount} 个损坏的数据项`)
      }
    } catch (error) {
      console.error('清理损坏数据失败:', error)
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