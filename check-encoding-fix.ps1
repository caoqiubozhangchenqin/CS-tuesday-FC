# 乱码修复 - 快速诊断脚本
# 运行此脚本检查修复进度

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  小说乱码问题 - 快速诊断" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查1：iconv-lite依赖
Write-Host "[1/3] 检查依赖..." -ForegroundColor Yellow
Set-Location "F:\CSFC\cloudfunctions\adminUploadNovel"

$iconvCheck = npm list iconv-lite 2>&1 | Select-String "iconv-lite"
if ($iconvCheck) {
    Write-Host "✅ iconv-lite 已安装: $iconvCheck" -ForegroundColor Green
} else {
    Write-Host "❌ iconv-lite 未安装！" -ForegroundColor Red
    Write-Host "   请运行: npm install iconv-lite@^0.6.3" -ForegroundColor Yellow
}

Write-Host ""

# 检查2：云函数代码
Write-Host "[2/3] 检查云函数代码..." -ForegroundColor Yellow
$indexContent = Get-Content "index.js" -Raw

if ($indexContent -match "iconv-lite") {
    Write-Host "✅ 云函数代码已包含 iconv-lite 引用" -ForegroundColor Green
} else {
    Write-Host "❌ 云函数代码未更新！" -ForegroundColor Red
}

if ($indexContent -match "使用GBK编码解析" -or $indexContent -match "使用UTF-8编码解析") {
    Write-Host "✅ 云函数代码已包含编码检测逻辑" -ForegroundColor Green
} else {
    Write-Host "❌ 云函数代码缺少编码检测逻辑！" -ForegroundColor Red
}

Write-Host ""

# 检查3：提示接下来的操作
Write-Host "[3/3] 接下来需要做的：" -ForegroundColor Yellow
Write-Host ""
Write-Host "步骤1：上传云函数到云端" -ForegroundColor White
Write-Host "  → 右键 cloudfunctions/adminUploadNovel" -ForegroundColor Gray
Write-Host "  → 选择 '上传并部署：云端安装依赖'" -ForegroundColor Gray
Write-Host "  → 等待完成（约30秒-1分钟）" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤2：删除乱码小说" -ForegroundColor White
Write-Host "  → 打开小程序" -ForegroundColor Gray
Write-Host "  → 进入 '管理员上传' 页面" -ForegroundColor Gray
Write-Host "  → 点击乱码书籍的 🗑️ 按钮" -ForegroundColor Gray
Write-Host "  → 确认删除" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤3：重新上传TXT文件" -ForegroundColor White
Write-Host "  → 选择原始的TXT文件" -ForegroundColor Gray
Write-Host "  → 点击 '开始上传'" -ForegroundColor Gray
Write-Host "  → 等待成功提示" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤4：验证修复效果" -ForegroundColor White
Write-Host "  → 打开 '我的书架'" -ForegroundColor Gray
Write-Host "  → 点击重新上传的小说" -ForegroundColor Gray
Write-Host "  → 确认中文正常显示" -ForegroundColor Gray
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  详细说明请查看：" -ForegroundColor Cyan
Write-Host "  小说乱码问题-完整修复指南.md" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 返回项目根目录
Set-Location "F:\CSFC"
