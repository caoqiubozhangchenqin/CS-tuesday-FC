# 部署 parseNovel 云函数
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  部署 parseNovel 云函数" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "[步骤 1/2] 进入云函数目录..." -ForegroundColor Yellow
$cloudFunctionPath = Join-Path $scriptPath "cloudfunctions\parseNovel"

if (-Not (Test-Path $cloudFunctionPath)) {
    Write-Host "❌ 错误：找不到云函数目录" -ForegroundColor Red
    pause
    exit 1
}

Set-Location $cloudFunctionPath
Write-Host "✓ 已进入：$cloudFunctionPath" -ForegroundColor Green

Write-Host ""
Write-Host "[步骤 2/2] 安装依赖包..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误：npm install 失败" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✓ 依赖安装完成" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 云函数准备完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 接下来请在微信开发者工具中：" -ForegroundColor White
Write-Host "  1. 找到 cloudfunctions/parseNovel 文件夹" -ForegroundColor White
Write-Host "  2. 右键点击 -> 上传并部署：云端安装依赖" -ForegroundColor White
Write-Host "  3. 等待部署完成（约30秒）" -ForegroundColor White
Write-Host ""
Write-Host "🎯 优化内容：" -ForegroundColor Yellow
Write-Host "  • 增加纯标题格式识别（适用于《三体》等书籍）" -ForegroundColor White
Write-Host "  • 增加中文数字章节识别" -ForegroundColor White
Write-Host "  • 增加序号+标题格式识别" -ForegroundColor White
Write-Host "  • 优化章节过滤逻辑" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

Set-Location $scriptPath

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
