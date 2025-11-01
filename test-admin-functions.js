// 测试云函数部署状态 - 管理员功能专用
// 在微信开发者工具控制台中运行此代码

console.log('🔍 测试管理员功能云函数部署状态...');

// 专门测试管理员相关的云函数
const adminFunctions = ['updateBugStatus', 'deleteBug'];

adminFunctions.forEach(funcName => {
  console.log(`测试 ${funcName} 云函数...`);
  wx.cloud.callFunction({
    name: funcName,
    data: { test: true },
    success: (res) => {
      console.log(`✅ ${funcName} 云函数部署成功`);
    },
    fail: (err) => {
      console.error(`❌ ${funcName} 云函数未部署:`, err);
      console.log(`💡 请在微信开发者工具中部署 ${funcName} 云函数`);
    }
  });
});

// 获取完整的云函数列表
setTimeout(() => {
  console.log('📋 获取所有云函数列表...');
  wx.cloud.getFunctions({
    success: (res) => {
      console.log('当前部署的云函数:');
      res.functions.forEach(func => {
        console.log(`  - ${func.name}`);
      });

      const deployedAdminFunctions = adminFunctions.filter(funcName =>
        res.functions.some(f => f.name === funcName)
      );

      console.log(`管理员功能云函数部署状态: ${deployedAdminFunctions.length}/${adminFunctions.length}`);

      if (deployedAdminFunctions.length === adminFunctions.length) {
        console.log('🎉 所有管理员功能云函数都已部署成功！');
        console.log('现在可以正常使用bug状态更新和删除功能了！');
      } else {
        const missingFunctions = adminFunctions.filter(funcName =>
          !res.functions.some(f => f.name === funcName)
        );
        console.log('⚠️ 以下云函数还未部署:', missingFunctions.join(', '));
      }
    },
    fail: (err) => {
      console.error('❌ 获取云函数列表失败:', err);
    }
  });
}, 2000);