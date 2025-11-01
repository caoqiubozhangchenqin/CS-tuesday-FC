// pages/admin/admin.js
const app = getApp();

Page({
  data: {
    isAdmin: false
  },

  onLoad: function (options) {
    this.checkAdminStatus();
  },

  // 身份验证函数 (保持不变)
  checkAdminStatus: function(retryCount = 0) {
    const adminOpenid = 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw'; // 您的管理员OpenID
    const userOpenid = app.globalData.openid;

    if (!userOpenid) {
      if (retryCount >= 5) {
        wx.hideLoading();
        wx.showToast({ title: '用户身份获取失败', icon: 'none' });
        setTimeout(() => { wx.navigateBack(); }, 1500);
        return;
      }
      if (retryCount === 0) {
        wx.showLoading({ title: '身份验证中...' });
      }
      setTimeout(() => {
        this.checkAdminStatus(retryCount + 1);
      }, 500);
      return;
    }

    if (userOpenid === adminOpenid) {
      wx.hideLoading();
      this.setData({ isAdmin: true });
    } else {
      wx.hideLoading();
      wx.showToast({ title: '无权访问', icon: 'error' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    }
  },

  /**
   * 处理按钮点击事件，调用 'resetSeasonData' 云函数
   */
  handleResetSeason: function() {
    // 【重大修改】弹出更强烈的警告，明确告知用户数据的永久删除
    wx.showModal({
      title: '【高危操作】请再次确认',
      content: '此操作将永久删除「users」集合中的所有用户数据（包括OpenID、昵称、头像等），且无法恢复！您确定要清空整个用户数据库吗？',
      confirmText: '确认清空', // 修改按钮文字
      confirmColor: '#ee0a24', // 保持红色警告色
      success: (res) => {
        if (res.confirm) {
          // 用户确认后，调用执行函数
          this.executeClearDatabase();
        } else {
          console.log('用户已取消操作');
          wx.showToast({
            title: '操作已取消',
            icon: 'none'
          });
        }
      }
    })
  },

  /**
   * 【重大修改】执行清空数据库操作的函数 (函数名已修改以反映新功能)
   */
  executeClearDatabase: function() {
    // 【修改】更新加载提示
    wx.showLoading({ title: '正在清空数据...', mask: true });

    // 调用云函数 'resetSeasonData'
    wx.cloud.callFunction({
      name: 'resetSeasonData'
    }).then(res => {
      wx.hideLoading();
      
      // 根据云函数返回的 success 字段判断结果
      if (res.result && res.result.success) {
        // 云函数执行成功
        // 【修改】获取新的 'deleted' 字段，而不是旧的 'updated'
        const deletedCount = res.result.deleted || 0;
        
        // 【修改】显示与新功能匹配的成功信息
        wx.showToast({
          title: `操作成功，已清空 ${deletedCount} 条用户数据`,
          icon: 'success',
          duration: 3000 // 延长提示时间
        });
        console.log('云函数返回成功信息:', res.result);

      } else {
        // 云函数执行失败（例如权限不足等）
        wx.showToast({
          title: (res.result && res.result.message) || '操作失败',
          icon: 'none',
          duration: 3000
        });
        console.error('云函数返回失败信息:', res.result);
      }
    }).catch(err => {
      // 调用云函数本身失败（例如网络问题）
      wx.hideLoading();
      wx.showToast({
        title: '请求服务器失败',
        icon: 'none',
        duration: 2000
      });
      console.error('调用云函数失败:', err);
    });
  },

  /**
   * 处理初始化bug集合按钮点击事件
   */
  handleInitBugsCollection: function() {
    wx.showModal({
      title: '初始化bug系统',
      content: '这将创建 "bugs" 数据库集合，用于存储用户提交的bug报告。确定要继续吗？',
      confirmText: '确认初始化',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          this.executeInitBugsCollection();
        } else {
          wx.showToast({
            title: '操作已取消',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 执行初始化bug集合操作
   */
  executeInitBugsCollection: function() {
    wx.showLoading({ title: '正在初始化...', mask: true });

    // 调用云函数 'initBugsCollection'
    wx.cloud.callFunction({
      name: 'initBugsCollection'
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: res.result.message || '初始化成功',
          icon: 'success',
          duration: 3000
        });
        console.log('初始化成功:', res.result);
      } else {
        wx.showToast({
          title: (res.result && res.result.message) || '初始化失败',
          icon: 'none',
          duration: 3000
        });
        console.error('初始化失败:', res.result);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '请求服务器失败',
        icon: 'none',
        duration: 2000
      });
      console.error('调用云函数失败:', err);
    });
  }
});