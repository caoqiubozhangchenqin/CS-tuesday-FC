// pages/team_status/team_status.js
Page({
  data: {
    teamsWithInterest: [], // 用于存储队伍数据
    isLoading: true,       // 用于控制加载状态
  },

  onLoad: function() {
    // 页面加载时，直接获取报名详情数据
    this.getRegistrationDetails(); 
  },

  // 获取报名详情的函数 (async/await 版本)
  getRegistrationDetails: async function() {
    this.setData({ isLoading: true }); // 开始加载时，设置加载状态
    wx.showLoading({ title: '加载数据...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getAdminDetails' 
      });

      // 调试日志，非常重要，可以看云函数返回了什么
      console.log('云函数 getAdminDetails 返回结果:', res); 

      if (res.result && res.result.success && res.result.data.length > 0) {
        this.setData({
          teamsWithInterest: res.result.data,
          isLoading: false // 数据加载成功，结束加载状态
        });
      } else {
        // 云函数返回了 success: false 或者 data 是空数组
        this.setData({ 
            isLoading: false,
            teamsWithInterest: [] // 确保数据为空
        }); 
        // 可以不加弹窗提示，因为没有数据本身不是一个“错误”
        // wx.showToast({ title: '暂无数据', icon: 'none' });
      }
    } catch (err) {
      // 调用云函数本身失败了（比如网络问题）
      this.setData({ isLoading: false });
      wx.showToast({ title: '请求失败', icon: 'none' });
      console.error('获取报名详情失败', err);
    } finally {
      // 无论成功失败，最后都隐藏 loading 提示
      wx.hideLoading();
    }
  },

}); // Page({}) 的结尾