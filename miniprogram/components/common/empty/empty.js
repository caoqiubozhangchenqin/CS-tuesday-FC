// components/common/empty/empty.js
Component({
  properties: {
    // 空状态标题
    title: {
      type: String,
      value: '暂无数据'
    },
    // 空状态描述
    description: {
      type: String,
      value: ''
    },
    // 图标字符
    icon: {
      type: String,
      value: '📭'
    },
    // 是否显示操作按钮
    showAction: {
      type: Boolean,
      value: false
    },
    // 操作按钮文本
    actionText: {
      type: String,
      value: ''
    }
  },

  data: {
  },

  methods: {
    // 操作按钮点击事件
    onActionTap() {
      this.triggerEvent('action', {});
    }
  }
});