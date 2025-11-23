// 快速检查云函数是否部署成功
// 在微信开发者工具调试器控制台运行此代码

console.log('=== 开始检查 adminUploadNovel 云函数 ===\n');

wx.cloud.callFunction({
  name: 'adminUploadNovel',
  data: {}, // 故意不传参数，只测试函数是否存在
  success: res => {
    console.log('✅ 云函数已部署！');
    console.log('返回结果:', res.result);
    
    if (res.result && res.result.code === 'MISSING_PARAMS') {
      console.log('\n✅ 云函数运行正常！');
      console.log('提示: "缺少必要参数" 是正常的，说明函数在运行');
      console.log('\n📝 下一步：请在上传页面选择文件并上传');
    } else if (res.result && res.result.code === 'NO_PERMISSION') {
      console.log('\n⚠️ 权限检查失败');
      console.log('原因:', res.result.error);
      console.log('\n📝 请确认您的 openid 已配置为管理员');
      console.log('配置文件: cloudfunctions/adminUploadNovel/index.js 第27行');
    }
  },
  fail: err => {
    console.error('❌ 云函数部署失败或不存在！');
    console.error('错误信息:', err);
    
    if (err.errCode === -504003) {
      console.log('\n💡 解决方案：');
      console.log('1. 在微信开发者工具中找到 cloudfunctions/adminUploadNovel 文件夹');
      console.log('2. 右键点击 → 选择 "上传并部署：云端安装依赖"');
      console.log('3. 等待30秒-1分钟');
      console.log('4. 重新运行此检查脚本');
    } else if (err.errMsg && err.errMsg.includes('not found')) {
      console.log('\n💡 云函数不存在，请先部署：');
      console.log('右键点击 cloudfunctions/adminUploadNovel → 上传并部署');
    }
  }
});

console.log('\n检查中，请稍候...\n');
