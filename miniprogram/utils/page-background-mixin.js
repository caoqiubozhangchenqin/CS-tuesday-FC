/**
 * 页面背景图混入
 * 在页面的 JS 文件中使用：
 * const pageBackgroundMixin = require('../../utils/page-background-mixin.js');
 * Page(pageBackgroundMixin({
 *   // 你的页面配置...
 * }))
 */

module.exports = function(pageConfig) {
  const originalOnShow = pageConfig.onShow;
  const originalOnLoad = pageConfig.onLoad;

  // 设置背景图的函数
  const setPageBackground = function() {
    const app = getApp();
    if (app && app.globalData.globalBackgroundImageUrl) {
      // 动态设置 page 元素的背景
      const query = wx.createSelectorQuery();
      query.select('page').node();
      
      // 使用 wxss 变量的方式
      this.setData({
        globalBgUrl: app.globalData.globalBackgroundImageUrl
      });
    } else {
      // 如果背景图还没加载完，延迟重试
      setTimeout(() => {
        const app = getApp();
        if (app && app.globalData.globalBackgroundImageUrl) {
          this.setData({
            globalBgUrl: app.globalData.globalBackgroundImageUrl
          });
        }
      }, 500);
    }
  };

  // 重写 onLoad
  pageConfig.onLoad = function(options) {
    setPageBackground.call(this);
    if (originalOnLoad) {
      originalOnLoad.call(this, options);
    }
  };

  // 重写 onShow
  pageConfig.onShow = function() {
    setPageBackground.call(this);
    if (originalOnShow) {
      originalOnShow.call(this);
    }
  };

  return pageConfig;
};
