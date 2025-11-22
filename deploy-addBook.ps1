# 添加《我 中国队长》到书架 - PowerShell 脚本
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  添加《我 中国队长》到书架" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 检查当前目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "[步骤 1/3] 进入云函数目录..." -ForegroundColor Yellow
$cloudFunctionPath = Join-Path $scriptPath "cloudfunctions\addBookToShelf"

if (-Not (Test-Path $cloudFunctionPath)) {
    Write-Host "❌ 错误：找不到云函数目录" -ForegroundColor Red
    Write-Host "路径：$cloudFunctionPath" -ForegroundColor Red
    pause
    exit 1
}

Set-Location $cloudFunctionPath
Write-Host "✓ 已进入：$cloudFunctionPath" -ForegroundColor Green

Write-Host ""
Write-Host "[步骤 2/3] 安装依赖包..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误：npm install 失败" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✓ 依赖安装完成" -ForegroundColor Green

Write-Host ""
Write-Host "[步骤 3/3] 部署说明" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 云函数准备完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 接下来请按照以下步骤操作：" -ForegroundColor White
Write-Host ""
Write-Host "方法1：使用微信开发者工具部署" -ForegroundColor Yellow
Write-Host "  1. 打开微信开发者工具" -ForegroundColor White
Write-Host "  2. 找到 cloudfunctions/addBookToShelf 文件夹" -ForegroundColor White
Write-Host "  3. 右键点击 -> 上传并部署：云端安装依赖" -ForegroundColor White
Write-Host "  4. 等待部署完成（约30秒）" -ForegroundColor White
Write-Host ""
Write-Host "方法2：在开发者工具控制台执行代码" -ForegroundColor Yellow
Write-Host "  复制以下代码到控制台：" -ForegroundColor White
Write-Host ""
Write-Host @"
wx.cloud.callFunction({
  name: 'addBookToShelf',
  data: {
    name: '我 中国队长',
    author: '未知作者',
    intro: '一本超过10MB的大型小说，讲述中国队长的故事。',
    category: '未分类',
    format: 'TXT',
    fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
    cloudPath: '小说/我 中国队长.txt',
    size: 10485760,
    sizeText: '> 10 MB'
  }
}).then(res => {
  console.log('✅ 添加成功:', res);
  wx.showToast({ title: '已添加到书架', icon: 'success' });
}).catch(err => {
  console.error('❌ 添加失败:', err);
  wx.showToast({ title: '添加失败', icon: 'none' });
});
"@ -ForegroundColor Cyan
Write-Host ""
Write-Host "方法3：直接在云开发控制台添加" -ForegroundColor Yellow
Write-Host "  查看详细说明：添加书籍到书架指南.md" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

# 返回原目录
Set-Location $scriptPath

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
