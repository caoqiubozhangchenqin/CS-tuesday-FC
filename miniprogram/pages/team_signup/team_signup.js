const db = wx.cloud.database();

Page({
  data: {
    teams: [],
    myTotalValue: 0,
    mySelectedTeam: ''
  },

  onLoad: function (options) {
    if (options.totalValue) {
      this.setData({
        myTotalValue: Number(options.totalValue)
      });
    }
    this.getAllTeamsAndMyInfo();
  },
  getAllTeamsAndMyInfo: async function () {
    wx.showLoading({
      title: '加载中...',
    });
    
    try {
      // 调用云函数获取球队及其总身价
      const adminRes = await wx.cloud.callFunction({
        name: 'getAdminDetails'
      });
      
      const teamsWithValue = adminRes.result.data || [];
      console.log('球队数据（含总身价）:', teamsWithValue);

      const userRes = await wx.cloud.callFunction({
          name: 'getUserInterestedTeams'
      });
      
      const mySelectedTeam = userRes.result.selectedTeam || '';
      
      const updatedTeams = teamsWithValue.map(team => ({
        _id: team._id,
        name: team.teamName,
        salary_cap: team.salary_cap || 0,
        totalTeamValue: team.totalTeamValue || 0,
        isSelected: mySelectedTeam === team._id
      }));
      
      console.log('处理后的球队数据:', updatedTeams);
      
      this.setData({
        teams: updatedTeams,
        mySelectedTeam: mySelectedTeam
      });

    } catch (e) {
      console.error('获取数据失败', e);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  handleJoinTeam: async function (e) {
    const teamId = e.currentTarget.dataset.teamId;
    wx.showLoading({
      title: '报名中...',
    });
    wx.cloud.callFunction({
      name: 'joinTeam',
      data: {
        teamId: teamId
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          // 获取球队ID用于更新本地存储和数据库
          wx.setStorageSync('selectedTeam', teamId);
          wx.showToast({
            title: '欢迎加入！',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                wx.navigateBack(); // 签约成功后返回首页
              }, 2000);
            }
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
        wx.showToast({
          title: '报名失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  },
  
  handleCancelJoinTeam: function (e) {
    const teamId = e.currentTarget.dataset.teamId;
    wx.showLoading({
      title: '取消中...',
    });
    wx.cloud.callFunction({
      name: 'cancelJoinTeam',
      data: {
        teamId: teamId
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          // 取消签约时清除本地存储的球队信息
          wx.removeStorageSync('selectedTeam');
          wx.showToast({
            title: '解约成功',
            icon: 'success',
            duration: 2000
          });
          // 重新加载数据以更新页面显示
          this.getAllTeamsAndMyInfo();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '取消失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  },
  
  handleResetSelections: async function() {
    if (!this.data.mySelectedTeam) {
      wx.showToast({
        title: '您还没有选择队伍',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '重置中...',
    });
    
    wx.cloud.callFunction({
      name: 'cancelJoinTeam',
      data: {
        teamId: this.data.mySelectedTeam
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          // 重置选择时清除本地存储的球队信息
          wx.removeStorageSync('selectedTeam');
          wx.showToast({
            title: '重置成功',
            icon: 'success',
            duration: 2000
          });
          // 重新加载数据以更新页面显示
          this.getAllTeamsAndMyInfo();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '重置失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  }
});