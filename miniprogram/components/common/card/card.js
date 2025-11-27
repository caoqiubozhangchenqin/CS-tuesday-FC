// components/common/card/card.js
Component({
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: ''
    },
    // 卡片副标题
    subtitle: {
      type: String,
      value: ''
    },
    // 卡片类型 (primary, success, warning, danger, info)
    type: {
      type: String,
      value: ''
    },
    // 是否显示阴影
    shadow: {
      type: Boolean,
      value: true
    },
    // 底部内容
    footer: {
      type: String,
      value: ''
    },
    // 额外内容
    extra: {
      type: String,
      value: ''
    }
  },

  data: {
  },

  methods: {
    // 卡片点击事件
    onTap() {
      this.triggerEvent('tap', {});
    }
  }
});