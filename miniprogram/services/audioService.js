/**
 * P-Word 专业录音服务模块
 * 提供高质量录音、实时波形、音频分析等功能
 */

const security = require('./security.js')

class AudioService {
  constructor() {
    this.recorderManager = null
    this.audioContext = null
    this.isRecording = false
    this.audioPath = ''
    this.recordStartTime = 0
    this.frameData = []
    this.waveformBuffer = []
    
    this.initRecorder()
  }

  /**
   * 初始化录音管理器
   */
  initRecorder() {
    this.recorderManager = wx.getRecorderManager()
    
    // 高质量录音配置
    this.recorderOptions = {
      duration: 120000,         // 最大录音时长2分钟
      sampleRate: 44100,        // 高采样率44.1kHz
      numberOfChannels: 1,      // 单声道
      encodeBitRate: 192000,    // 高码率192kbps
      format: 'mp3',           // MP3格式
      frameSize: 50            // 帧大小50KB
    }

    this._bindEvents()
  }

  /**
   * 绑定录音事件
   */
  _bindEvents() {
    // 录音开始
    this.recorderManager.onStart(() => {
      this.isRecording = true
      this.recordStartTime = Date.now()
      this.frameData = []
      this.waveformBuffer = []
      console.log('🎤 高质量录音开始')
      
      if (this.onRecordStart) {
        this.onRecordStart()
      }
    })

    // 录音停止
    this.recorderManager.onStop((res) => {
      this.isRecording = false
      this.audioPath = res.tempFilePath
      const duration = Date.now() - this.recordStartTime
      
      console.log('🎤 录音完成:', {
        duration: duration + 'ms',
        fileSize: res.fileSize,
        path: res.tempFilePath
      })

      if (this.onRecordStop) {
        this.onRecordStop({
          ...res,
          duration: Math.floor(duration / 1000),
          waveformData: this.waveformBuffer
        })
      }
    })

    // 录音帧数据
    this.recorderManager.onFrameRecorded((res) => {
      const frameBuffer = res.frameBuffer
      this.frameData.push(frameBuffer)
      
      // 处理波形数据
      const waveData = this._processFrameBuffer(frameBuffer)
      this.waveformBuffer.push(...waveData)
      
      if (this.onFrameRecorded) {
        this.onFrameRecorded(waveData)
      }
    })

    // 录音错误
    this.recorderManager.onError((res) => {
      this.isRecording = false
      console.error('🎤 录音错误:', res)
      
      if (this.onRecordError) {
        this.onRecordError(res)
      }
    })
  }

  /**
   * 处理音频帧数据为波形数据
   * @param {ArrayBuffer} frameBuffer 音频帧数据
   * @returns {Array} 波形数据数组
   */
  _processFrameBuffer(frameBuffer) {
    const data = new Int16Array(frameBuffer)
    const waveData = []
    
    // 降采样处理，每16个样本取一个
    const sampleStep = Math.max(1, Math.floor(data.length / 64))
    
    for (let i = 0; i < data.length; i += sampleStep) {
      // 计算RMS(均方根)值，更好地表示音频能量
      let sum = 0
      const windowSize = Math.min(sampleStep, data.length - i)
      
      for (let j = 0; j < windowSize; j++) {
        const sample = data[i + j] / 32768 // 归一化到 -1 到 1
        sum += sample * sample
      }
      
      const rms = Math.sqrt(sum / windowSize)
      waveData.push(rms)
    }
    
    return waveData
  }

  /**
   * 开始录音
   * @returns {boolean} 是否成功开始
   */
  startRecording() {
    if (this.isRecording) {
      console.warn('⚠️ 录音已在进行中')
      return false
    }

    try {
      this.recorderManager.start(this.recorderOptions)
      return true
    } catch (error) {
      console.error('❌ 开始录音失败:', error)
      return false
    }
  }

  /**
   * 停止录音
   * @returns {boolean} 是否成功停止
   */
  stopRecording() {
    if (!this.isRecording) {
      console.warn('⚠️ 当前没有录音进行')
      return false
    }

    try {
      this.recorderManager.stop()
      return true
    } catch (error) {
      console.error('❌ 停止录音失败:', error)
      return false
    }
  }

  /**
   * 播放录音
   * @returns {Promise} 播放Promise
   */
  playRecording() {
    return new Promise((resolve, reject) => {
      if (!this.audioPath) {
        reject(new Error('没有可播放的录音'))
        return
      }

      // 创建音频上下文
      this.audioContext = wx.createInnerAudioContext()
      this.audioContext.src = this.audioPath

      // 绑定播放事件
      this.audioContext.onPlay(() => {
        console.log('▶️ 开始播放录音')
        if (this.onPlayStart) {
          this.onPlayStart()
        }
      })

      this.audioContext.onEnded(() => {
        console.log('⏹️ 播放结束')
        this.audioContext.destroy()
        this.audioContext = null
        if (this.onPlayEnd) {
          this.onPlayEnd()
        }
        resolve()
      })

      this.audioContext.onError((error) => {
        console.error('❌ 播放失败:', error)
        this.audioContext.destroy()
        this.audioContext = null
        if (this.onPlayError) {
          this.onPlayError(error)
        }
        reject(error)
      })

      // 开始播放
      this.audioContext.play()
    })
  }

  /**
   * 停止播放
   */
  stopPlaying() {
    if (this.audioContext) {
      this.audioContext.stop()
      this.audioContext.destroy()
      this.audioContext = null
    }
  }

  /**
   * 分析录音质量
   * @returns {Object} 录音质量分析结果
   */
  analyzeAudioQuality() {
    if (this.waveformBuffer.length === 0) {
      return null
    }

    const waveData = this.waveformBuffer
    
    // 1. 音量分析
    const avgVolume = waveData.reduce((sum, val) => sum + val, 0) / waveData.length
    const maxVolume = Math.max(...waveData)
    const minVolume = Math.min(...waveData)
    
    // 2. 动态范围分析
    const dynamicRange = maxVolume - minVolume
    
    // 3. 音量稳定性（方差）
    const variance = waveData.reduce((sum, val) => sum + Math.pow(val - avgVolume, 2), 0) / waveData.length
    const stability = Math.max(0, 100 - Math.sqrt(variance) * 100)
    
    // 4. 静音检测
    const silenceThreshold = 0.01
    const silentFrames = waveData.filter(val => val < silenceThreshold).length
    const silenceRatio = silentFrames / waveData.length
    
    // 5. 削峰检测
    const clippingThreshold = 0.95
    const clippedFrames = waveData.filter(val => val > clippingThreshold).length
    const clippingRatio = clippedFrames / waveData.length
    
    return {
      avgVolume: Math.round(avgVolume * 100),
      maxVolume: Math.round(maxVolume * 100),
      dynamicRange: Math.round(dynamicRange * 100),
      stability: Math.round(stability),
      silenceRatio: Math.round(silenceRatio * 100),
      clippingRatio: Math.round(clippingRatio * 100),
      quality: this._calculateOverallQuality(avgVolume, stability, silenceRatio, clippingRatio)
    }
  }

  /**
   * 计算总体录音质量评分
   * @private
   */
  _calculateOverallQuality(avgVolume, stability, silenceRatio, clippingRatio) {
    let score = 100
    
    // 音量太低扣分
    if (avgVolume < 20) score -= (20 - avgVolume) * 2
    
    // 音量不稳定扣分
    score -= (100 - stability) * 0.5
    
    // 静音太多扣分
    if (silenceRatio > 30) score -= (silenceRatio - 30) * 1.5
    
    // 削峰扣分
    if (clippingRatio > 5) score -= clippingRatio * 3
    
    return Math.max(0, Math.round(score))
  }

  /**
   * 获取录音时长
   * @returns {number} 录音时长（秒）
   */
  getRecordDuration() {
    if (!this.recordStartTime) return 0
    const endTime = this.isRecording ? Date.now() : this.recordStartTime
    return Math.floor((endTime - this.recordStartTime) / 1000)
  }

  /**
   * 清理录音资源
   */
  cleanup() {
    if (this.audioContext) {
      this.audioContext.destroy()
      this.audioContext = null
    }
    
    this.audioPath = ''
    this.frameData = []
    this.waveformBuffer = []
    this.isRecording = false
    this.recordStartTime = 0
  }

  /**
   * 生成录音文件安全名称
   * @returns {string} 安全的文件名
   */
  generateSecureFileName() {
    return security.generateSecureFileName('.mp3')
  }

  /**
   * 设置事件回调
   */
  setEventHandlers({
    onRecordStart,
    onRecordStop,
    onFrameRecorded,
    onRecordError,
    onPlayStart,
    onPlayEnd,
    onPlayError
  }) {
    this.onRecordStart = onRecordStart
    this.onRecordStop = onRecordStop
    this.onFrameRecorded = onFrameRecorded
    this.onRecordError = onRecordError
    this.onPlayStart = onPlayStart
    this.onPlayEnd = onPlayEnd
    this.onPlayError = onPlayError
  }

  /**
   * 获取录音状态
   */
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      hasRecording: !!this.audioPath,
      duration: this.getRecordDuration(),
      frameCount: this.frameData.length,
      waveformLength: this.waveformBuffer.length
    }
  }
}

// 创建全局录音服务实例
const audioService = new AudioService()

module.exports = audioService 