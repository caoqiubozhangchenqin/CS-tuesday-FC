// pages/survey/survey.js
const db = wx.cloud.database();
const questionsCollection = db.collection('questions');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    questions: [],
    userAnswers: {},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    this.getQuestions();
  },

  /**
   * 从数据库获取所有问题
   */
  getQuestions: function () {
    wx.showLoading({
      title: '加载题目中...',
    });
    questionsCollection.get().then(res => {
      this.setData({
        questions: res.data.sort((a, b) => a.question_id.localeCompare(b.question_id))
      });
      wx.hideLoading();
    }).catch(err => {
      wx.hideLoading();
      console.error('获取问题失败', err);
      wx.showToast({ title: '题目加载失败', icon: 'none' });
    });
  },

  /**
   * 处理用户的选择
   */
  handleRadioChange: function (e) {
    const { questionId } = e.currentTarget.dataset;
    const selectedOption = e.detail.value;

    this.setData({
      [`userAnswers.${questionId}`]: selectedOption
    });
  }, // <--- 【关键修正点】在这里补上了一个逗号！

  /**
   * [核心重构] 使用 async/await 语法来提交答案
   * 这种写法更清晰，并且能用 finally 确保 hideLoading 被调用
   */
  async submitAnswers() {
    // 1. 检查是否答完所有题目
    if (Object.keys(this.data.userAnswers).length !== this.data.questions.length) {
      wx.showToast({ title: '请回答所有问题', icon: 'none' });
      return;
    }

    // 显示 loading
    wx.showLoading({ title: '正在提交...' });

    try {
      // 2. 尝试获取用户信息（若失败也不阻塞提交流程）
      let userInfo = null;
      try {
        const userRes = await wx.cloud.callFunction({ name: 'getUserInfo' });
        if (userRes.result && userRes.result.success) {
          userInfo = userRes.result.data;
        }
      } catch (e) {
        // 忽略获取用户信息失败，继续提交答卷
      }

      // 3. 计算总分和答案数组
      let totalValue = 0;
      let answersArray = [];
      this.data.questions.forEach(q => {
        const selectedOption = this.data.userAnswers[q.question_id];
        if (selectedOption) {
          const optionValue = q.options.find(opt => opt.option === selectedOption).value;
          totalValue += optionValue;
          answersArray.push({
            question_id: q.question_id,
            selected_option: selectedOption,
            value: optionValue
          });
        }
      });

      // 4. 等待提交答案的结果
      const payload = {
        answers: answersArray,
        totalValue: totalValue
      };
      if (userInfo && userInfo.nickname) payload.nickname = userInfo.nickname;
      if (userInfo && userInfo.avatarUrl) payload.avatarUrl = userInfo.avatarUrl;

      const submitRes = await wx.cloud.callFunction({ name: 'submitAnswers', data: payload });

      // 检查提交是否成功
      if (!submitRes.result || !submitRes.result.success) {
        throw new Error(submitRes.result.message || '提交失败');
      }

      // 5. 全部成功后的操作
      // 保存用户评估状态和身价到本地存储，确保无论是否选择球队都能显示身价
      wx.setStorageSync('hasCompletedSurvey', true);
      wx.setStorageSync('userValue', totalValue);
      
      wx.showToast({ 
        title: '评估完成！', 
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.navigateBack(); // 返回首页
          }, 2000);
        }
      });

    } catch (err) {
      // 6. 捕获上面流程中任何一步的错误
      wx.showModal({
        title: '操作失败',
        content: err && err.message ? err.message : '提交失败，请稍后重试',
        showCancel: false
      });

    } finally {
      // 7. [关键] 无论成功还是失败，finally 块都保证会被执行
      wx.hideLoading();
    }
  }
  // 注意：作为 Page 对象的最后一个成员，这里末尾不需要加逗号
});