// app.js
App({
  onLaunch: function () {
    // 1. 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3ge5gomsffe800a7', // 您的云开发环境 ID
        traceUser: true,
      });
    }

    // 2. 获取用户的 openid
    this.getOpenid();

    // 3. 初始化并设置全局背景音乐
    this.setupBackgroundMusic();

    // 4. 获取全局背景图的临时链接（来自云存储）
    this.setupBackgroundImage();
  },

  /**
   * 获取并全局存储 openid
   */
  getOpenid: function() {
    console.log("🚀 开始调用 login 云函数获取 openid...");
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        if (res.result && res.result.openid) {
          console.log("✅ 成功获取并全局存储 openid:", res.result.openid);
          this.globalData.openid = res.result.openid;
        } else {
          console.error("❌ 调用 login 云函数成功，但未返回 openid");
        }
      },
      fail: err => {
        console.error("❌ 调用 login 云函数失败", err);
      }
    });
  },

  // =========================================================
  //   ⬇️ 以下是全局背景音乐相关的代码 (已添加注释) ⬇️
  // =========================================================

  /**
   * 初始化背景音乐播放器
   */
  setupBackgroundMusic: function() {
    // 步骤 1: 获取全局唯一的背景音频管理器
    const backgroundAudioManager = wx.getBackgroundAudioManager();
    this.globalData.backgroundAudioManager = backgroundAudioManager;

    // 步骤 2: 从云存储获取音乐文件的临时链接
    // 注意：这里的 File ID 是您上传到云存储的音乐文件ID
    const BGM_FILE_ID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/周二的国王.mp3';

    wx.cloud.getTempFileURL({
      fileList: [BGM_FILE_ID],
      success: res => {
        if (res.fileList.length > 0) {
          const musicUrl = res.fileList[0].tempFileURL;
          
          // 步骤 3: 设置音频管理器的属性
          backgroundAudioManager.title = '背景音乐'; // 音乐标题（必填）
          backgroundAudioManager.singer = ' '; // 歌手名
          backgroundAudioManager.coverImgUrl = ' '; // 封面图
          backgroundAudioManager.src = musicUrl; // 音频链接（必填）
          
          // 步骤 4: 设置事件监听器
          this.setupMusicListeners(backgroundAudioManager);

          // 当音乐准备好播放时，设置音量并开始播放
          backgroundAudioManager.onCanplay(() => {
            backgroundAudioManager.volume = 0.3; // 设置一个合适的初始音量
            this.playMusic(); 
          });

        } else {
          console.error("❌ 从云存储获取音乐文件链接失败", res);
        }
      },
      fail: err => {
        console.error("❌ 调用 getTempFileURL 失败", err);
      }
    });
  },
  
  /**
   * 统一设置音乐播放的核心事件监听
   */
  setupMusicListeners: function(manager) {
    manager.onPlay(() => { 
      console.log('音乐：播放');
      this.globalData.isMusicPlaying = true;
      this.notifyMusicStatusChange();
    });
    manager.onPause(() => { 
      console.log('音乐：暂停');
      this.globalData.isMusicPlaying = false; 
      this.notifyMusicStatusChange();
    });
    manager.onStop(() => { 
      console.log('音乐：停止');
      this.globalData.isMusicPlaying = false; 
      this.notifyMusicStatusChange();
    });
    manager.onEnded(() => { 
      console.log('音乐：播放结束');
      this.globalData.isMusicPlaying = false;
      this.notifyMusicStatusChange();
      // 【可选功能】如果希望音乐循环播放，可以取消下面这行代码的注释
      // this.playMusic(); 
    });
  },

  /**
   * 全局播放音乐接口
   */
  playMusic: function() {
    if (this.globalData.backgroundAudioManager) {
      this.globalData.backgroundAudioManager.play();
    }
  },

  /**
   * 从云存储获取背景图的临时链接，保存到 globalData.bgImageUrl
   */
  setupBackgroundImage: function() {
    const BG_FILE_ID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/football 2.png';
    if (!wx.cloud || !wx.cloud.getTempFileURL) return;
    wx.cloud.getTempFileURL({
      fileList: [BG_FILE_ID],
      success: res => {
        if (res && res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          this.globalData.bgImageUrl = res.fileList[0].tempFileURL;
          console.log('✅ 已获取并存储背景图临时链接', this.globalData.bgImageUrl);
          // 通知所有 bg 监听器
          if (typeof this.notifyBgUrl === 'function') {
            this.notifyBgUrl(this.globalData.bgImageUrl);
          }
        } else {
          console.error('❌ 获取背景图临时链接失败', res);
        }
      },
      fail: err => {
        console.error('❌ 调用 getTempFileURL 获取背景图失败', err);
      }
    });
  },

  /**
   * 注册一个背景图变化监听器，返回一个取消监听的函数
   */
  addBgListener: function(listener) {
    if (!this.globalData.bgListeners) this.globalData.bgListeners = [];
    this.globalData.bgListeners.push(listener);
    // 返回取消监听的函数
    return () => {
      const idx = this.globalData.bgListeners.indexOf(listener);
      if (idx !== -1) this.globalData.bgListeners.splice(idx, 1);
    };
  },

  notifyBgUrl: function(url) {
    const list = this.globalData.bgListeners || [];
    list.forEach(fn => {
      try { fn(url); } catch (e) { console.error('bg listener error', e); }
    });
  },

  /**
   * 全局暂停音乐接口
   */
  pauseMusic: function() {
    if (this.globalData.backgroundAudioManager) {
      this.globalData.backgroundAudioManager.pause();
    }
  },
  
  /**
   * 全局退出登录的处理函数
   */
  logout: function() {
    try {
      wx.setStorageSync('isLoggedOut', true);
      wx.removeStorageSync('userInfo');
    } catch (e) {}

    // 清空全局用户信息，但保留openid
    this.globalData.userInfo = null;
    
    // 停止音乐并更新状态
    if (this.globalData.backgroundAudioManager) {
      try { this.globalData.backgroundAudioManager.stop(); } catch (e) {}
    }
    // 注意：onStop监听器会自动处理状态更新和通知，这里无需重复调用
  },
  
  /**
   * 通知所有监听页面，音乐状态发生了改变
   */
  notifyMusicStatusChange: function() {
    // 遍历监听器数组，并执行每个监听函数
    this.globalData.musicStatusListeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(this.globalData.isMusicPlaying);
      }
    });
  },

  /**
   * 全局数据
   */
  globalData: {
    userInfo: null,
    openid: null,
    backgroundAudioManager: null,
    isMusicPlaying: false,
    musicStatusListeners: [] // 存储所有页面的监听函数
  }
});