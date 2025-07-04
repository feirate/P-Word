Component({
  properties: {
    isRecording: {
      type: Boolean,
      value: false,
    },
    recordDurationText: {
      type: String,
      value: '00:00'
    }
  },
  data: {
    canvasWidth: 0,
    canvasHeight: 100,
    waveData: [],
    isAudioServiceReady: false
  },

  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
      this.initCanvas();
    },
    detached: function() {
      // 在组件实例被从页面节点树移除时执行
      this.stopWaveformAnimation();
      if (this.setupCanvasTimer) {
        clearTimeout(this.setupCanvasTimer);
      }
    },
  },

  methods: {
    // ---- PUBLIC METHODS ----
    pushData(data) {
      this.updateWaveform(data);
    },

    clear() {
      this.setData({ waveData: [] });
      this.clearCanvas();
      this.stopWaveformAnimation();
    },

    start() {
      this.clear();
      this.startWaveformAnimation();
    },

    stop(finalWaveData) {
      this.stopWaveformAnimation();
      if(finalWaveData && finalWaveData.length > 0) {
        this.setData({ waveData: finalWaveData });
        this.drawFinalWaveform();
      }
    },

    // ---- INTERNAL WAVEFORM LOGIC (Moved from index.js) ----
    
    // 初始化Canvas
    initCanvas() {
      if (this.setupCanvasTimer) {
        clearTimeout(this.setupCanvasTimer);
      }
      this.setupCanvasTimer = setTimeout(() => {
        this.setupCanvas();
      }, 100);
    },

    setupCanvas() {
        if (this.isUnloaded || this._canvas) {
            return;
        }
        const query = this.createSelectorQuery();
        query.select('#waveCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
                if (!res[0] || !res[0].node) {
                    console.warn('⚠️ Canvas节点获取失败，100ms后重试...');
                    this.initCanvas();
                    return;
                }
                const canvas = res[0].node;
                if (!canvas) {
                    console.error('❌ 无法获取Canvas节点');
                    return;
                }
                this._canvas = canvas;
                this._canvas.width = res[0].width;
                this._canvas.height = res[0].height;
                
                this.setData({
                    canvasWidth: res[0].width,
                    canvasHeight: res[0].height
                });
                
                this.initCanvasContext();
            });
    },

    initCanvasContext() {
        if (!this._canvas) {
            console.error('❌ Canvas未初始化，无法获取上下文');
            return;
        }
        this._ctx = this._canvas.getContext('2d');
        if (!this._ctx) {
            console.error('❌ 无法获取2D上下文');
        } else {
            // console.log('✅ Canvas上下文已成功初始化');
        }
    },

    updateWaveform(waveData) {
        // 直接更新内部数据，不使用setData
        this.data.waveData.push(...waveData);
        // 限制数据长度，防止内存溢出
        if (this.data.waveData.length > this.data.canvasWidth * 2) {
            this.data.waveData.splice(0, this.data.waveData.length - this.data.canvasWidth * 2);
        }
    },

    startWaveformAnimation() {
        this.stopWaveformAnimation();
        const animate = () => {
            this.drawWaveform();
            this.animationFrameId = this._canvas.requestAnimationFrame(animate);
        };
        animate();
    },

    stopWaveformAnimation() {
        if (this.animationFrameId) {
            this._canvas.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },
    
    drawWaveform() {
      if (!this._ctx) return;
      const ctx = this._ctx;
      const { canvasWidth, canvasHeight, waveData } = this.data;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      const barWidth = 2;
      const gap = 1;
      const numBars = Math.floor(canvasWidth / (barWidth + gap));
      const centerY = canvasHeight / 2;
      
      const displayedData = waveData.slice(-numBars);
      
      ctx.beginPath();
      for (let i = 0; i < displayedData.length; i++) {
        const amplitude = displayedData[i];
        const barHeight = Math.max(1, amplitude * canvasHeight);
        const x = i * (barWidth + gap);
        const y = centerY - barHeight / 2;
        
        ctx.fillStyle = this.getVolumeBasedColor(amplitude, true);
        ctx.roundRect(x, y, barWidth, barHeight, 1);
      }
      ctx.fill();
    },
    
    drawFinalWaveform() {
        if (!this._ctx) {
            this.setupCanvas();
            setTimeout(() => this.drawFinalWaveform(), 100);
            return;
        }
        const ctx = this._ctx;
        const { canvasWidth, canvasHeight, waveData } = this.data;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const barWidth = 2;
        const gap = 1;
        const numBars = Math.floor(canvasWidth / (barWidth + gap));
        const step = Math.max(1, Math.floor(waveData.length / numBars));
        const centerY = canvasHeight / 2;

        ctx.beginPath();
        for (let i = 0; i < numBars; i++) {
            const index = i * step;
            const amplitude = waveData[index] || 0;
            const barHeight = Math.max(1, amplitude * canvasHeight * 1.2);
            const x = i * (barWidth + gap);
            const y = centerY - barHeight / 2;

            ctx.fillStyle = this.getVolumeBasedColor(amplitude, false);
            try {
              ctx.roundRect(x, y, barWidth, barHeight, 1);
            } catch(e) {
              this.drawRoundRectManually(ctx, x, y, barWidth, barHeight, 1);
            }
        }
        ctx.fill();
    },
    
    getVolumeBasedColor(amplitude, isRecording = false) {
      if (isRecording) {
          if (amplitude > 0.7) return '#4CAF50'; // 亮绿色
          if (amplitude > 0.4) return '#8BC34A'; // 柔和绿
          if (amplitude > 0.2) return '#CDDC39'; // 黄绿色
          return '#AED581'; // 浅绿
      } else {
          if (amplitude > 0.6) return '#2196F3'; // 蓝色
          if (amplitude > 0.3) return '#64B5F6'; // 浅蓝
          return '#BBDEFB'; // 更浅的蓝
      }
    },

    clearCanvas() {
        if (this._ctx) {
            this._ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
        }
        this.setData({ waveData: [] });
    },

    drawRoundRectManually(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }
  }
}) 