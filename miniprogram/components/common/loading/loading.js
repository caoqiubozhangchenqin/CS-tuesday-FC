// components/common/loading/loading.js
Component({
  properties: {
    // 是否显示加载状态
    show: {
      type: Boolean,
      value: false
    },
    // 加载文本
    text: {
      type: String,
      value: '加载中...'
    },
    // 是否显示遮罩
    mask: {
      type: Boolean,
      value: true
    }
  },

  data: {
  },

  methods: {
  }
});