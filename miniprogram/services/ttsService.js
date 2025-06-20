/**
 * 语音朗读服务 (TTS - Text To Speech)
 * 专门处理英文句子的语音朗读功能
 */

class TTSService {
  constructor() {
    this.isPlaying = false;
    this.currentAudio = null;
    this.autoPlayEnabled = true; // 是否开启自动朗读
    this.playbackRate = 1.0;     // 播放速度
    this.volume = 1.0;           // 音量
  }

  /**
   * 播放英文文本
   * @param {string} text 要朗读的英文文本
   * @param {Object} options 朗读选项
   * @returns {Promise} 播放结果
   */
  async playText(text, options = {}) {
    try {
      // 停止当前播放
      this.stopCurrent();

      // 合并配置选项
      const config = {
        lang: 'en-US',
        rate: options.rate || this.playbackRate,
        volume: options.volume || this.volume,
        autoStop: options.autoStop !== false,
        ...options
      };

      // 使用微信API进行语音合成
      return new Promise((resolve, reject) => {
        // 标记开始播放
        this.isPlaying = true;

        // 创建语音合成实例
        const ttsTask = wx.createInnerAudioContext();
        
        // 使用系统TTS API（如果支持）
        if (wx.createSynthesizeEngine) {
          this.synthesizeWithEngine(text, config, resolve, reject);
        } else {
          // 降级方案：使用在线TTS服务
          this.synthesizeWithOnlineService(text, config, resolve, reject);
        }
      });

    } catch (error) {
      console.error('TTS播放失败:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  /**
   * 使用微信语音合成引擎
   */
  synthesizeWithEngine(text, config, resolve, reject) {
    try {
      const synthesizeEngine = wx.createSynthesizeEngine({
        lang: config.lang,
        ttsRate: config.rate,
        ttsVolume: config.volume
      });

      synthesizeEngine.onStart(() => {
        console.log('TTS开始播放');
        this.isPlaying = true;
      });

      synthesizeEngine.onEnd(() => {
        console.log('TTS播放结束');
        this.isPlaying = false;
        resolve({ success: true });
      });

      synthesizeEngine.onError((error) => {
        console.error('TTS播放错误:', error);
        this.isPlaying = false;
        reject(error);
      });

      // 开始合成并播放
      synthesizeEngine.speak({
        content: text
      });

      this.currentAudio = synthesizeEngine;

    } catch (error) {
      console.log('语音合成引擎不支持，使用在线服务');
      this.synthesizeWithOnlineService(text, config, resolve, reject);
    }
  }

  /**
   * 使用在线TTS服务（降级方案）
   */
  synthesizeWithOnlineService(text, config, resolve, reject) {
    try {
      // 可以接入第三方TTS服务，如：
      // 1. 百度语音合成
      // 2. 腾讯云语音合成
      // 3. 阿里云语音合成
      
      // 这里使用浏览器内置的SpeechSynthesis（仅模拟器支持）
      if (typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = config.lang;
        utterance.rate = config.rate;
        utterance.volume = config.volume;

        utterance.onstart = () => {
          this.isPlaying = true;
        };

        utterance.onend = () => {
          this.isPlaying = false;
          resolve({ success: true });
        };

        utterance.onerror = (error) => {
          this.isPlaying = false;
          reject(error);
        };

        speechSynthesis.speak(utterance);
        this.currentAudio = utterance;

      } else {
        // 最终降级：显示提示信息
        this.isPlaying = false;
        console.log('当前环境不支持语音合成');
        resolve({ 
          success: false, 
          message: '当前环境不支持语音朗读功能' 
        });
      }

    } catch (error) {
      this.isPlaying = false;
      reject(error);
    }
  }

  /**
   * 停止当前播放
   */
  stopCurrent() {
    if (this.currentAudio) {
      try {
        if (this.currentAudio.stop) {
          this.currentAudio.stop();
        } else if (this.currentAudio.destroy) {
          this.currentAudio.destroy();
        } else if (typeof speechSynthesis !== 'undefined') {
          speechSynthesis.cancel();
        }
      } catch (error) {
        console.warn('停止TTS播放时出错:', error);
      }
      
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  /**
   * 暂停播放
   */
  pause() {
    if (this.currentAudio && this.currentAudio.pause) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * 恢复播放
   */
  resume() {
    if (this.currentAudio && this.currentAudio.resume) {
      this.currentAudio.resume();
      this.isPlaying = true;
    }
  }

  /**
   * 设置播放速度
   * @param {number} rate 播放速度 (0.1 - 2.0)
   */
  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.1, Math.min(2.0, rate));
  }

  /**
   * 设置音量
   * @param {number} volume 音量 (0.0 - 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0.0, Math.min(1.0, volume));
  }

  /**
   * 设置自动播放
   * @param {boolean} enabled 是否启用自动播放
   */
  setAutoPlay(enabled) {
    this.autoPlayEnabled = enabled;
  }

  /**
   * 获取播放状态
   */
  getPlayingStatus() {
    return {
      isPlaying: this.isPlaying,
      autoPlayEnabled: this.autoPlayEnabled,
      playbackRate: this.playbackRate,
      volume: this.volume
    };
  }

  /**
   * 检查是否支持TTS
   */
  isSupported() {
    return !!(
      wx.createSynthesizeEngine || 
      (typeof SpeechSynthesisUtterance !== 'undefined')
    );
  }

  /**
   * 清理资源
   */
  destroy() {
    this.stopCurrent();
    this.isPlaying = false;
    this.currentAudio = null;
  }
}

// 创建单例实例
const ttsService = new TTSService();

module.exports = ttsService; 