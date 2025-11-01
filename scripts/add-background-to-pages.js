/**
 * 批量为所有页面添加背景图支持
 * 使用方法: node scripts/add-background-to-pages.js
 */

const fs = require('fs');
const path = require('path');

// 需要添加背景的页面列表（index已经完成，跳过）
const pages = [
  'admin/admin',
  'captain_panel/captain_panel',
  'ranking/ranking',
  'registration_status/registration_status',
  'result/result',
  'schedule/schedule',
  'standings/standings',
  'survey/survey',
  'team_signup/team_signup',
  'team_status/team_status'
];

const pagesDir = path.join(__dirname, '../miniprogram/pages');

// 处理每个页面
pages.forEach(pagePath => {
  const jsFile = path.join(pagesDir, `${pagePath}.js`);
  const wxmlFile = path.join(pagesDir, `${pagePath}.wxml`);
  
  console.log(`\n处理页面: ${pagePath}`);
  
  // 1. 修改 JS 文件
  if (fs.existsSync(jsFile)) {
    let jsContent = fs.readFileSync(jsFile, 'utf8');
    
    // 检查是否已经添加过
    if (jsContent.includes('globalBgUrl')) {
      console.log(`  ✓ ${pagePath}.js 已有背景图支持，跳过`);
    } else {
      // 在 data 中添加 globalBgUrl
      jsContent = jsContent.replace(
        /(data:\s*{[^}]*)/,
        '$1,\n    globalBgUrl: \'\''
      );
      
      // 在 onLoad 开头添加背景图设置
      jsContent = jsContent.replace(
        /(onLoad:\s*function\s*\([^)]*\)\s*{)/,
        '$1\n    getApp().setPageBackground(this);'
      );
      
      // 添加 onShow 方法（如果不存在）
      if (!jsContent.includes('onShow:')) {
        jsContent = jsContent.replace(
          /(onLoad:\s*function\s*\([^)]*\)\s*{[^}]*}),/,
          `$1,\n\n  onShow: function() {\n    if (!this.data.globalBgUrl) {\n      setTimeout(() => {\n        const app = getApp();\n        if (app.globalData.globalBackgroundImageUrl) {\n          this.setData({ globalBgUrl: app.globalData.globalBackgroundImageUrl });\n        }\n      }, 100);\n    }\n  },`
        );
      }
      
      fs.writeFileSync(jsFile, jsContent, 'utf8');
      console.log(`  ✓ 已更新 ${pagePath}.js`);
    }
  } else {
    console.log(`  ✗ 文件不存在: ${jsFile}`);
  }
  
  // 2. 修改 WXML 文件
  if (fs.existsSync(wxmlFile)) {
    let wxmlContent = fs.readFileSync(wxmlFile, 'utf8');
    
    // 检查是否已经添加过
    if (wxmlContent.includes('page-background')) {
      console.log(`  ✓ ${pagePath}.wxml 已有背景图，跳过`);
    } else {
      // 在文件开头添加背景图容器
      const backgroundView = '<!-- 全局背景图 -->\n<view class="page-background" style="background-image: url({{globalBgUrl}});"></view>\n\n';
      wxmlContent = backgroundView + wxmlContent;
      
      fs.writeFileSync(wxmlFile, wxmlContent, 'utf8');
      console.log(`  ✓ 已更新 ${pagePath}.wxml`);
    }
  } else {
    console.log(`  ✗ 文件不存在: ${wxmlFile}`);
  }
});

console.log('\n\n✅ 批量添加完成！请重新编译小程序查看效果。');
