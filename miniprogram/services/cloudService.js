/**
 * P-Word 云数据同步服务
 * 提供练习记录云端同步、离线数据上传、数据备份等功能
 */

const security = require('./security.js')

class CloudService {
  constructor() {
    this.isOnline = true
    this.syncQueue = []
    this.lastSyncTime = 0
    this.maxRetries = 3
    this.retryDelay = 2000 // 2秒
    
    this.initService()
  }

  /**
   * 初始化云服务
   */
  initService() {
    // 检查网络状态
    this.checkNetworkStatus()
    
    // 监听网络状态变化
    wx.onNetworkStatusChange(this.onNetworkStatusChange.bind(this))
    
    // 加载同步队列
    this.loadSyncQueue()
    
    console.log('☁️ 云服务初始化完成')
  }

  /**
   * 检查网络状态
   */
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        this.isOnline = res.networkType !== 'none'
        console.log(`📶 网络状态: ${this.isOnline ? '在线' : '离线'} (${res.networkType})`)
        
        // 如果网络恢复，尝试同步离线数据
        if (this.isOnline && this.syncQueue.length > 0) {
          this.processSyncQueue()
        }
      }
    })
  }

  /**
   * 网络状态变化处理
   */
  onNetworkStatusChange(res) {
    const wasOnline = this.isOnline
    this.isOnline = res.isConnected
    
    console.log(`📶 网络状态变化: ${this.isOnline ? '已连接' : '已断开'}`)
    
    // 网络恢复时处理同步队列
    if (!wasOnline && this.isOnline && this.syncQueue.length > 0) {
      console.log('🔄 网络恢复，开始同步离线数据...')
      this.processSyncQueue()
    }
  }

  /**
   * 同步练习记录到云端
   * @param {Object} practiceRecord 练习记录
   * @returns {Promise} 同步结果
   */
  async syncPracticeRecord(practiceRecord) {
    try {
      // 添加云端同步必要字段
      const cloudRecord = {
        ...practiceRecord,
        _id: practiceRecord.id,
        openid: this.getUserOpenId(),
        deviceId: this.getDeviceId(),
        syncTime: Date.now(),
        version: '1.0'
      }

      if (this.isOnline) {
        // 在线直接同步
        const result = await this.uploadToCloud(cloudRecord)
        console.log('☁️ 练习记录已同步到云端:', result)
        return result
      } else {
        // 离线加入同步队列
        this.addToSyncQueue(cloudRecord)
        console.log('📱 练习记录已加入离线同步队列')
        return { success: true, offline: true }
      }
    } catch (error) {
      console.error('❌ 练习记录同步失败:', error)
      
      // 同步失败时加入重试队列
      this.addToSyncQueue(practiceRecord)
      throw error
    }
  }

  /**
   * 上传数据到云数据库
   * @param {Object} record 记录数据
   * @returns {Promise} 上传结果
   */
  uploadToCloud(record) {
    return new Promise((resolve, reject) => {
      // 检查是否为开发环境
      const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : true
      const delay = isDevelopment ? 200 : (500 + Math.random() * 1000)
      
      // 模拟云数据库API调用
      // 实际项目中这里应该是微信云开发的数据库操作
      setTimeout(() => {
        try {
          if (isDevelopment) {
            // 开发环境：100%成功率
            resolve({
              success: true,
              _id: record._id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now()
            })
          } else {
            // 生产环境：模拟一定的失败率
            if (Math.random() > 0.05) { // 95%成功率
              resolve({
                success: true,
                _id: record._id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now()
              })
            } else {
              reject(new Error('网络连接超时，请稍后重试'))
            }
          }
        } catch (error) {
          console.error('❌ 云数据库上传异常:', error)
          reject(new Error('上传服务暂时不可用'))
        }
      }, delay)
    })
  }

  /**
   * 从云端下载练习记录
   * @param {Object} options 查询选项
   * @returns {Promise} 下载结果
   */
  async downloadPracticeRecords(options = {}) {
    try {
      if (!this.isOnline) {
        throw new Error('网络不可用，无法下载云端数据')
      }

      const query = {
        openid: this.getUserOpenId(),
        ...options.where
      }

      const result = await this.queryFromCloud(query, options)
      console.log(`☁️ 从云端下载了 ${result.data.length} 条练习记录`)
      
      return result
    } catch (error) {
      console.error('❌ 下载练习记录失败:', error)
      throw error
    }
  }

  /**
   * 从云数据库查询数据
   * @param {Object} query 查询条件
   * @param {Object} options 查询选项
   * @returns {Promise} 查询结果
   */
  queryFromCloud(query, options = {}) {
    return new Promise((resolve, reject) => {
      // 检查是否为开发环境
      const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : true
      const delay = isDevelopment ? 100 : (300 + Math.random() * 700)
      
      // 模拟云数据库查询
      setTimeout(() => {
        try {
          if (isDevelopment) {
            // 开发环境：100%成功率，便于开发调试
            const mockData = this.generateMockCloudData(query, options)
            resolve({
              success: true,
              data: mockData,
              total: mockData.length
            })
          } else {
            // 生产环境：模拟一定的失败率
            if (Math.random() > 0.02) { // 98%成功率
              const mockData = this.generateMockCloudData(query, options)
              resolve({
                success: true,
                data: mockData,
                total: mockData.length
              })
            } else {
              reject(new Error('网络请求超时，请稍后重试'))
            }
          }
        } catch (error) {
          console.error('❌ 云数据库查询异常:', error)
          reject(new Error('查询服务暂时不可用'))
        }
      }, delay)
    })
  }

  /**
   * 生成模拟云端数据
   */
  generateMockCloudData(query, options) {
    // 返回空数组，实际项目中这里是真实的云端数据
    return []
  }

  /**
   * 同步用户偏好设置到云端
   * @param {Object} preferences 用户偏好
   * @returns {Promise} 同步结果
   */
  async syncUserPreferences(preferences) {
    try {
      const cloudPreferences = {
        _id: `preferences_${this.getUserOpenId()}`,
        openid: this.getUserOpenId(),
        ...preferences,
        lastUpdateTime: Date.now()
      }

      if (this.isOnline) {
        const result = await this.uploadToCloud(cloudPreferences)
        console.log('☁️ 用户偏好已同步到云端')
        return result
      } else {
        this.addToSyncQueue(cloudPreferences)
        console.log('📱 用户偏好已加入离线同步队列')
        return { success: true, offline: true }
      }
    } catch (error) {
      console.error('❌ 用户偏好同步失败:', error)
      throw error
    }
  }

  /**
   * 合并本地和云端数据
   * @param {Array} localRecords 本地记录
   * @param {Array} cloudRecords 云端记录
   * @returns {Array} 合并后的记录
   */
  mergeLocalAndCloudData(localRecords, cloudRecords) {
    const mergedMap = new Map()

    // 添加本地记录
    localRecords.forEach(record => {
      mergedMap.set(record.id, {
        ...record,
        source: 'local'
      })
    })

    // 合并云端记录（云端数据优先）
    cloudRecords.forEach(record => {
      const localRecord = mergedMap.get(record._id)
      
      if (!localRecord || record.syncTime > (localRecord.timestamp || 0)) {
        mergedMap.set(record._id, {
          ...record,
          id: record._id,
          source: 'cloud'
        })
      }
    })

    const mergedRecords = Array.from(mergedMap.values())
    console.log(`🔄 数据合并完成: 本地${localRecords.length}条, 云端${cloudRecords.length}条, 合并后${mergedRecords.length}条`)
    
    return mergedRecords
  }

  /**
   * 添加到同步队列
   * @param {Object} data 待同步数据
   */
  addToSyncQueue(data) {
    const queueItem = {
      id: security.generateSecureId(),
      data,
      timestamp: Date.now(),
      retries: 0
    }

    this.syncQueue.push(queueItem)
    this.saveSyncQueue()
    
    console.log(`📝 数据已添加到同步队列 (队列长度: ${this.syncQueue.length})`)
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return
    }

    console.log(`🔄 开始处理同步队列 (${this.syncQueue.length} 项)`)
    
    const processedItems = []
    
    for (const item of this.syncQueue) {
      try {
        await this.uploadToCloud(item.data)
        processedItems.push(item)
        console.log(`✅ 同步成功: ${item.id}`)
      } catch (error) {
        item.retries++
        console.error(`❌ 同步失败 (${item.retries}/${this.maxRetries}): ${item.id}`, error)
        
        // 超过重试次数则放弃
        if (item.retries >= this.maxRetries) {
          processedItems.push(item)
          console.warn(`⚠️ 达到最大重试次数，放弃同步: ${item.id}`)
        }
      }
    }

    // 从队列中移除已处理的项目
    this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item))
    this.saveSyncQueue()
    
    console.log(`🔄 同步队列处理完成，剩余 ${this.syncQueue.length} 项`)
  }

  /**
   * 加载同步队列
   */
  loadSyncQueue() {
    const queue = security.secureGet('sync_queue') || []
    this.syncQueue = queue
    console.log(`📂 同步队列已加载 (${queue.length} 项)`)
  }

  /**
   * 保存同步队列
   */
  saveSyncQueue() {
    security.secureStorage('sync_queue', this.syncQueue)
  }

  /**
   * 清空同步队列
   */
  clearSyncQueue() {
    this.syncQueue = []
    this.saveSyncQueue()
    console.log('🗑️ 同步队列已清空')
  }

  /**
   * 获取用户OpenID（模拟）
   */
  getUserOpenId() {
    // 实际项目中这里应该是真实的OpenID
    let openid = wx.getStorageSync('mock_openid')
    if (!openid) {
      openid = `mock_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      wx.setStorageSync('mock_openid', openid)
    }
    return openid
  }

  /**
   * 获取设备ID
   */
  getDeviceId() {
    let deviceId = wx.getStorageSync('device_id')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      wx.setStorageSync('device_id', deviceId)
    }
    return deviceId
  }

  /**
   * 执行完整同步
   * @returns {Promise} 同步结果
   */
  async performFullSync() {
    try {
      if (!this.isOnline) {
        throw new Error('网络不可用，无法执行同步')
      }

      console.log('🔄 开始执行完整数据同步...')
      
      // 1. 下载云端数据
      const cloudResult = await this.downloadPracticeRecords()
      
      // 2. 获取本地数据
      const localRecords = security.secureGet('practice_history') || []
      
      // 3. 合并数据
      const mergedRecords = this.mergeLocalAndCloudData(localRecords, cloudResult.data)
      
      // 4. 保存合并后的数据
      security.secureStorage('practice_history', mergedRecords)
      
      // 5. 处理离线同步队列
      await this.processSyncQueue()
      
      // 6. 更新最后同步时间
      this.lastSyncTime = Date.now()
      wx.setStorageSync('last_sync_time', this.lastSyncTime)
      
      console.log('✅ 完整数据同步完成')
      
      return {
        success: true,
        localCount: localRecords.length,
        cloudCount: cloudResult.data.length,
        mergedCount: mergedRecords.length,
        syncTime: this.lastSyncTime
      }
      
    } catch (error) {
      console.error('❌ 完整数据同步失败:', error)
      throw error
    }
  }

  /**
   * 获取同步状态
   * @returns {Object} 同步状态信息
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      lastSyncDate: this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString() : '从未同步'
    }
  }

  /**
   * 手动触发同步
   * @returns {Promise} 同步结果
   */
  async manualSync() {
    if (!this.isOnline) {
      wx.showToast({
        title: '网络不可用',
        icon: 'none'
      })
      return { success: false, reason: 'offline' }
    }

    try {
      wx.showLoading({ title: '同步中...' })
      
      const result = await this.performFullSync()
      
      wx.hideLoading()
      wx.showToast({
        title: '同步完成',
        icon: 'success'
      })
      
      return result
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
      
      return { success: false, error: error.message }
    }
  }

  /**
   * 设置自动同步
   * @param {boolean} enabled 是否启用自动同步
   */
  setAutoSync(enabled) {
    const settings = security.secureGet('cloud_settings') || {}
    settings.autoSync = enabled
    security.secureStorage('cloud_settings', settings)
    
    if (enabled && this.isOnline) {
      // 启用自动同步时立即执行一次
      this.performFullSync().catch(error => {
        console.error('自动同步失败:', error)
      })
    }
    
    console.log(`⚙️ 自动同步已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 获取云服务配置
   */
  getCloudSettings() {
    return security.secureGet('cloud_settings') || {
      autoSync: true,
      syncOnLaunch: true,
      maxQueueSize: 100
    }
  }
}

// 创建全局云服务实例
const cloudService = new CloudService()

module.exports = cloudService 