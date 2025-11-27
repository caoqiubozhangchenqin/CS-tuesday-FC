// 使用示例 - 如何使用新的工具类和组件
// 这个文件展示了优化后的代码应该如何使用新的工具

// 1. 错误处理工具使用示例
const ErrorHandler = require('../utils/errorHandler.js');

// 成功提示
ErrorHandler.showSuccess('操作成功！');

// 错误提示
ErrorHandler.showError('网络连接失败，请稍后重试');

// 确认对话框
ErrorHandler.showConfirm({
  title: '确认删除',
  content: '此操作不可逆，确定要继续吗？'
}).then(confirmed => {
  if (confirmed) {
    // 执行删除操作
  }
});

// 网络错误处理
try {
  // 一些网络请求
} catch (error) {
  ErrorHandler.handleNetworkError(error);
}

// 2. 缓存工具使用示例
const Cache = require('../utils/cache.js');

// 示例用户数据
const userData = { id: 1, name: '示例用户' };

// 设置缓存（5分钟）
Cache.set('user_info', userData, 5 * 60 * 1000);

// 获取缓存
const cachedData = Cache.get('user_info');

// 使用缓存模式（自动获取或设置）
async function loadApiData() {
  // 示例API函数
  const fetchFromAPI = async () => {
    return { data: '示例数据' };
  };

  const data = await Cache.getOrSet('api_data', async () => {
    return await fetchFromAPI();
  }, 10 * 60 * 1000); // 10分钟缓存
  return data;
}

// 3. 组件使用示例（在WXML中）
// 加载组件
// <loading show="{{loading}}" text="正在加载..." mask="{{true}}"></loading>

// 卡片组件
// <card title="卡片标题" subtitle="副标题" type="primary">
//   <view slot="content">卡片内容</view>
//   <view slot="footer">底部操作</view>
// </card>

// 空状态组件
// <empty
//   title="暂无数据"
//   description="这里还没有内容"
//   icon="📭"
//   show-action="{{true}}"
//   action-text="立即添加"
//   bindaction="onAddAction"
// ></empty>

// 4. 在页面JSON中引入组件
const pageJsonExample = {
  "usingComponents": {
    "loading": "/components/common/loading/loading",
    "card": "/components/common/card/card",
    "empty": "/components/common/empty/empty"
  }
};

// 5. 最佳实践
// - 优先使用ErrorHandler替代wx.showToast
// - 对API请求使用Cache.getOrSet进行缓存
// - 使用新组件替代自定义的loading/empty样式
// - 保持代码DRY原则，避免重复代码