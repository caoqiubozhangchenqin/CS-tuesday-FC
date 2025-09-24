Page({
  data: {
    rankingList: []
  },

  onLoad: function () {
    this.getRankingList();
  },

  getRankingList: function () {
    wx.showLoading({
      title: '加载中...',
    });
    wx.cloud.callFunction({
      name: 'getRanking',
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({
            rankingList: res.result.data
          });
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('获取排名失败', err);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    });
  }
});