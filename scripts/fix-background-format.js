/**
 * 修复批量添加背景图时产生的格式问题
 */

const fs = require('fs');
const path = require('path');

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

pages.forEach(pagePath => {
  const jsFile = path.join(pagesDir, `${pagePath}.js`);
  
  if (fs.existsSync(jsFile)) {
    let content = fs.readFileSync(jsFile, 'utf8');
    
    // 修复格式问题
    // 1. 修复 "key: value\n  ,\n    globalBgUrl" 格式
    content = content.replace(/(\w+:\s*[^,\n]+)\n\s*,\s*\n\s*(globalBgUrl:\s*'')/g, '$1,\n    $2');
    
    // 2. 修复 "key: {,\n    globalBgUrl" 格式
    content = content.replace(/(\w+:\s*{),\s*\n\s*(globalBgUrl:\s*'')/g, '$1\n    $2');
    
    // 3. 修复 "globalBgUrl: ''}," 格式
    content = content.replace(/(globalBgUrl:\s*'')}\s*,/g, '$1\n  },');
    
    fs.writeFileSync(jsFile, content, 'utf8');
    console.log(`✓ 已修复 ${pagePath}.js`);
  }
});

console.log('\n✅ 格式修复完成！');
