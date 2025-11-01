// pages/survey/survey.js
const db = wx.cloud.database();
const questionsCollection = db.collection('questions');

Page({
  data: {
    questions: [],
    userAnswers: {},
    globalBgUrl: ''
  },

  onLoad: function () {
    getApp().setPageBackground(this);
    this.getQuestions();
  },

  onShow: function() {
    if (!this.data.globalBgUrl) {
      setTimeout(() => {
        const app = getApp();
        if (app.globalData.globalBackgroundImageUrl) {
          this.setData({ globalBgUrl: app.globalData.globalBackgroundImageUrl });
        }
      }, 100);
    }
  },

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

  handleRadioChange: function (e) {
    const { questionId } = e.currentTarget.dataset;
    const selectedOption = e.detail.value;

    this.setData({
      [`userAnswers.${questionId}`]: selectedOption
    });
  },

  async submitAnswers() {
    if (Object.keys(this.data.userAnswers).length !== this.data.questions.length) {
      wx.showToast({ title: '请回答所有问题', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在提交...' });

    try {
      let userInfo = null;
      try {
        const userRes = await wx.cloud.callFunction({ name: 'getUserInfo' });
        if (userRes.result && userRes.result.success) {
          userInfo = userRes.result.data;
        }
      } catch (e) {}

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

      const payload = {
        answers: answersArray,
        totalValue: totalValue
      };
      if (userInfo && userInfo.nickname) payload.nickname = userInfo.nickname;
      if (userInfo && userInfo.avatarUrl) payload.avatarUrl = userInfo.avatarUrl;

      const submitRes = await wx.cloud.callFunction({ name: 'submitAnswers', data: payload });

      if (!submitRes.result || !submitRes.result.success) {
        throw new Error(submitRes.result.message || '提交失败');
      }

      wx.showToast({ title: '提交成功！', icon: 'success' });
      wx.navigateTo({
        url: `/pages/team_signup/team_signup?totalValue=${totalValue}`
      });

    } catch (err) {
      wx.showModal({
        title: '操作失败',
        content: err && err.message ? err.message : '提交失败，请稍后重试',
        showCancel: false
      });

    } finally {
      wx.hideLoading();
    }
  }
});
