Component({
  properties: {
    title: {
      type: String,
      value: '详情'
    }
  },

  data: {
    show: false,
    details: null
  },

  methods: {
    // 显示弹窗
    showModal(details) {
      this.setData({
        show: true,
        details: details
      });
    },

    // 隐藏弹窗
    hideModal() {
      this.setData({
        show: false
      });
    }
  }
}) 