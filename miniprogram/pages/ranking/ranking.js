Page({
  data: {
    rankingList: [],
    currentPage: 1,
    pageSize: 50, // 每页显示50个排名
    totalCount: 0,
    isLoading: false,
    hasMore: true
  },

  onLoad: function () {
    this.getRankingList();
  },

  getRankingList: function () {
    if (this.data.isLoading || !this.data.hasMore) return;

    this.setData({ isLoading: true });

    wx.showLoading({
      title: '加载中...',
    });

    wx.cloud.callFunction({
      name: 'getRanking',
      data: {
        page: this.data.currentPage,
        pageSize: this.data.pageSize
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          const newData = res.result.data;
          const currentList = this.data.currentPage === 1 ? [] : this.data.rankingList;

          this.setData({
            rankingList: [...currentList, ...newData],
            currentPage: this.data.currentPage + 1,
            totalCount: res.result.totalCount || 0,
            hasMore: newData.length === this.data.pageSize,
            isLoading: false
          });
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
          this.setData({ isLoading: false });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('获取排名失败', err);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    });
  },

  // 加载更多排名
  loadMore: function() {
    this.getRankingList();
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      rankingList: [],
      currentPage: 1,
      hasMore: true
    });
    this.getRankingList();
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  onReachBottom: function() {
    this.getRankingList();
  }
});