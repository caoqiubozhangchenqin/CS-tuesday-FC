Component({
  data: {
    bgUrl: ''
  },
  lifetimes: {
    attached() {
      // 从全局数据中获取背景图URL
      const app = getApp();
      if (app.globalData.globalBackgroundImageUrl) {
        this.setData({
          bgUrl: app.globalData.globalBackgroundImageUrl
        });
      } else {
        // 如果还没加载完，等待一下再获取
        setTimeout(() => {
          if (app.globalData.globalBackgroundImageUrl) {
            this.setData({
              bgUrl: app.globalData.globalBackgroundImageUrl
            });
          }
        }, 500);
      }
    }
  }
});
