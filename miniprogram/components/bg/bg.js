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
  lifetimes: {
    attached() {
      // 优先使用传入的 src，否则从 app.globalData 读取
      const app = getApp();
      if (this.data.src) {
        this.setData({ bgUrl: this.data.src });
      } else if (app && app.globalData && app.globalData.bgImageUrl) {
        this.setData({ bgUrl: app.globalData.bgImageUrl });
      } else if (app && typeof app.addBgListener === 'function') {
        // 注册监听器，拿到就设置
        this._removeListener = app.addBgListener(url => {
          if (url) this.setData({ bgUrl: url });
        });
      }
    },
    detached() {
      if (this._removeListener) this._removeListener();
    }
  }
});
