// pages/ranking/ranking.js
const db = wx.cloud.database()

Page({
  data: {
    rankingList: [],
    isLoading: true
  },

  onLoad(options) {
    this.getRankingData();
  },

  // 下拉刷新功能
  onPullDownRefresh() {
    this.getRankingData(() => {
      wx.stopPullDownRefresh(); // 数据加载完成后停止下拉刷新动画
    });
  },

  getRankingData(callback) {
    this.setData({ isLoading: true });
    
    // 从standings集合获取数据，并按照规则排序
    db.collection('standings')
      .orderBy('points', 'desc')
      .orderBy('goalDifference', 'desc')
      .orderBy('goalsFor', 'desc')
      .get({
        success: res => {
          this.setData({
            rankingList: res.data,
            isLoading: false
          });
          if (callback) callback();
        },
        fail: err => {
          console.error(err);
          this.setData({ isLoading: false });
          if (callback) callback();
        }
      });
  }
})