/**
 * 语音朗读服务 (TTS - Text To Speech)
 * 专门处理英文句子的语音朗读功能
 */

class TTSService {
  constructor() {
    this.isPlaying = false;
    this.currentAudio = null;
    this.autoPlayEnabled = true;
    this.playbackRate = 1.0;
    this.volume = 1.0;
  }

  /**
   * 播放英文文本
   * @param {string} text 要朗读的英文文本
   * @param {Object} options 朗读选项
   * @returns {Promise} 播放结果
   */
  async playText(text, options = {}) {
    try {
      this.stopCurrent();

      const config = {
        lang: 'en-US',
        rate: options.rate || this.playbackRate,
        volume: options.volume || this.volume,
        autoStop: options.autoStop !== false,
        ...options
      };

      return new Promise((resolve, reject) => {
        this.isPlaying = true;

        const ttsTask = wx.createInnerAudioContext();
        
        if (wx.createSynthesizeEngine) {
          this.synthesizeWithEngine(text, config, resolve, reject);
        } else {
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
        this.isPlaying = true;
      });

      synthesizeEngine.onEnd(() => {
        this.isPlaying = false;
        resolve({ success: true });
      });

      synthesizeEngine.onError((error) => {
        console.error('TTS播放错误:', error);
        this.isPlaying = false;
        reject(error);
      });

      synthesizeEngine.speak({
        content: text
      });

      this.currentAudio = synthesizeEngine;

    } catch (error) {
      this.synthesizeWithOnlineService(text, config, resolve, reject);
    }
  }

  /**
   * 使用在线TTS服务（降级方案）
   */
  synthesizeWithOnlineService(text, config, resolve, reject) {
    try {
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
        this.isPlaying = false;
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
    const checks = {
      wxCreateSynthesizeEngine: !!wx.createSynthesizeEngine,
      speechSynthesis: typeof speechSynthesis !== 'undefined',
      speechSynthesisUtterance: typeof SpeechSynthesisUtterance !== 'undefined',
      innerAudioContext: !!wx.createInnerAudioContext
    };
    
    
    return !!(
      wx.createSynthesizeEngine || 
      (typeof SpeechSynthesisUtterance !== 'undefined')
    );
  }

  /**
   * 获取详细的TTS支持信息
   */
  getTTSSupportInfo() {
    const wxAPI = {
      createSynthesizeEngine: typeof wx.createSynthesizeEngine,
      getAvailableAudioSources: typeof wx.getAvailableAudioSources,
      createInnerAudioContext: typeof wx.createInnerAudioContext,
    };

    const browserAPI = {
      speechSynthesis: typeof speechSynthesis,
      SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance,
    };

    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    
    const environment = deviceInfo.environment || (typeof window !== 'undefined' ? 'browser' : 'unknown');

    return {
      environment,
      wxAPI,
      browserAPI,
      platform: deviceInfo.platform,
      system: deviceInfo.system,
    };
  }

  /**
   * 显示调试面板
   */
  showDebugPanel() {
    const info = this.getTTSSupportInfo();
    wx.showModal({
      title: 'TTS调试信息',
      content: JSON.stringify(info, null, 2),
      showCancel: false
    });
  }

  /**
   * 模拟TTS播放（用于开发者工具测试）
   */
  mockTTSPlayback(text, duration = 2000) {
    return new Promise(resolve => {
      this.isPlaying = true;
      setTimeout(() => {
        this.isPlaying = false;
        resolve({ success: true, message: '模拟播放完成' });
      }, duration);
    });
  }

  /**
   * 申请TTS可能需要的权限（如录音权限）
   */
  async requestPermissions() {
    
    try {
      const setting = await wx.getSetting();
      if (setting.authSetting['scope.record']) {
        return true;
      }

      await wx.authorize({ scope: 'scope.record' });
      return true;

    } catch (error) {
      console.error('TTS权限申请失败:', error);
      this.showPermissionGuide();
      return false;
    }
  }

  /**
   * 显示权限引导
   */
  showPermissionGuide(callback) {
    wx.showModal({
      title: '权限申请',
      content: '语音朗读功能需要获取您的录音权限，以确保音频功能的正常运行。',
      confirmText: '去设置',
      showCancel: false,
      success: async (res) => {
        if (res.confirm) {
          const settingRes = await wx.openSetting();
          if (callback) callback(settingRes.authSetting['scope.record'] || false);
        }
      }
    });
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.stopCurrent();
    
    this.isPlaying = false;
    this.currentAudio = null;
  }
}

const ttsService = new TTSService();
module.exports = ttsService; 