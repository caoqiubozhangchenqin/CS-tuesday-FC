Component({
  properties: {
    src: { type: String, value: '' },
    overlayOpacity: { type: Number, value: 0.2 },
    blur: { type: Number, value: 2 },
    sizeMode: { type: String, value: 'auto' },
    repeat: { type: Boolean, value: true }
  },
  data: {
    bgUrl: ''
  },
  methods: {
    loadBgImage(url) {
      if (!url) return;
      
      // 如果是云存储路径，需要转换为临时链接
      if (url.startsWith('cloud://')) {
        wx.cloud.getTempFileURL({
          fileList: [url],
          success: res => {
            if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
              this.setData({ bgUrl: res.fileList[0].tempFileURL });
            }
          },
          fail: err => {
            console.error('获取云存储临时链接失败', err);
          }
        });
      } else {
        // 普通 HTTPS 链接直接使用
        this.setData({ bgUrl: url });
      }
    }
  },
  lifetimes: {
    attached() {
      // 优先使用传入的 src，否则从 app.globalData 读取
      const app = getApp();
      if (this.properties.src) {
        this.loadBgImage(this.properties.src);
      } else if (app && app.globalData && app.globalData.bgImageUrl) {
        this.loadBgImage(app.globalData.bgImageUrl);
      } else if (app && typeof app.addBgListener === 'function') {
        // 注册监听器，拿到就设置
        this._removeListener = app.addBgListener(url => {
          if (url) this.loadBgImage(url);
        });
      }
    },
    detached() {
      if (this._removeListener) this._removeListener();
    }
  }
});
