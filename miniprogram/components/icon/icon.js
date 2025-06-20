Component({
  properties: {
    // 图标名称
    name: {
      type: String,
      value: ''
    },
    // 自定义样式类
    class: {
      type: String,
      value: ''
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    },
    // 描边宽度
    strokeWidth: {
      type: Number,
      value: 2
    },
    // 图标大小
    size: {
      type: Number,
      value: 24
    },
    // 图标颜色
    color: {
      type: String,
      value: ''
    }
  },

  data: {},

  attached() {
    // 根据size和color属性设置样式
    this.updateStyle()
  },

  observers: {
    'size, color': function(size, color) {
      this.updateStyle()
    }
  },

  methods: {
    updateStyle() {
      const { size, color, customStyle } = this.properties
      let style = customStyle || ''
      
      if (size) {
        style += `width: ${size}rpx; height: ${size}rpx;`
      }
      
      if (color) {
        style += `color: ${color};`
      }
      
      this.setData({
        computedStyle: style
      })
    },

    // 图标点击事件
    onIconTap() {
      this.triggerEvent('tap', {
        name: this.properties.name
      })
    }
  }
}) 