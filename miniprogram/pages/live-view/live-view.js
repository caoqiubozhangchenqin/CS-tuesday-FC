// pages/live-view/live-view.js
Page({
  data: {
    liveUrl: ''
  },

  onLoad(options) {
    if (options.url) {
      // URL解码
      const decodedUrl = decodeURIComponent(options.url);
      this.setData({
        liveUrl: decodedUrl
      });
      console.log('直播URL:', decodedUrl);
    } else {
      wx.showToast({
        title: '缺少直播链接',
        icon: 'none'
      });
      wx.navigateBack();
    }
  }
});