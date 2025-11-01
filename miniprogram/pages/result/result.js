Page({
  data: {
    totalValue: 0,
    nickname: '',
    avatarUrl: ''
  },

  onLoad: function () {
    this.getUserInfo();
  },

  getUserInfo: function () {
    wx.showLoading({
      title: '加载中...',
    });
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          const userData = res.result.data;
          this.setData({
            totalValue: userData.total_value,
            nickname: userData.nickname,
            avatarUrl: userData.avatarUrl
          });
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取用户信息失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    });
  }
});