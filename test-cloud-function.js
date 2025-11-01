// 测试云函数部署状态
// 在微信开发者工具控制台中运行此代码

console.log('🔍 开始测试云函数部署状态...');

// 1. 测试已知存在的云函数 (login)
console.log('1. 测试 login 云函数...');
wx.cloud.callFunction({
  name: 'login',
  success: (res) => {
    console.log('✅ login 云函数存在');
  },
  fail: (err) => {
    console.error('❌ login 云函数不存在:', err);
  }
});

// 2. 测试新创建的云函数 (updateBugStatus)
console.log('2. 测试 updateBugStatus 云函数...');
wx.cloud.callFunction({
  name: 'updateBugStatus',
  data: {
    test: true
  },
  success: (res) => {
    console.log('✅ updateBugStatus 云函数存在:', res);
  },
  fail: (err) => {
    console.error('❌ updateBugStatus 云函数不存在:', err);
    console.log('💡 解决方案：请在微信开发者工具中部署 updateBugStatus 云函数');
  }
});

// 3. 获取所有云函数列表
setTimeout(() => {
  console.log('3. 获取云函数列表...');
  wx.cloud.getFunctions({
    success: (res) => {
      console.log('📋 可用的云函数列表:');
      res.functions.forEach(func => {
        console.log(`  - ${func.name}`);
      });

      const hasUpdateBugStatus = res.functions.some(f => f.name === 'updateBugStatus');
      if (!hasUpdateBugStatus) {
        console.log('⚠️  updateBugStatus 云函数未找到，请部署后再试');
      }
    },
    fail: (err) => {
      console.error('❌ 获取云函数列表失败:', err);
    }
  });
}, 1000);