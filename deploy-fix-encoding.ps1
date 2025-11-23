# 修复小说乱码 - 快速部署脚本
# 使用方法：在PowerShell中运行此脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  修复小说乱码 - 快速部署" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 步骤1：进入云函数目录
Write-Host "[1/3] 进入云函数目录..." -ForegroundColor Yellow
Set-Location "F:\CSFC\cloudfunctions\adminUploadNovel"

# 步骤2：安装依赖
Write-Host "[2/3] 安装 iconv-lite 依赖..." -ForegroundColor Yellow
npm install iconv-lite@^0.6.3

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 依赖安装成功！" -ForegroundColor Green
} else {
    Write-Host "❌ 依赖安装失败，请检查网络连接" -ForegroundColor Red
    exit 1
}

# 步骤3：提示手动上传
Write-Host ""
Write-Host "[3/3] 接下来请手动操作：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 打开微信开发者工具" -ForegroundColor White
Write-Host "2. 右键点击 cloudfunctions/adminUploadNovel 文件夹" -ForegroundColor White
Write-Host "3. 选择 '上传并部署：云端安装依赖'" -ForegroundColor White
Write-Host "4. 等待上传完成（约30秒-1分钟）" -ForegroundColor White
Write-Host ""
Write-Host "5. 删除乱码的小说（如《中国2185》）" -ForegroundColor White
Write-Host "6. 重新上传同一个TXT文件" -ForegroundColor White
Write-Host "7. 打开查看是否正常显示" -ForegroundColor White
Write-Host ""
Write-Host "✅ 准备完成！现在可以上传云函数了！" -ForegroundColor Green
Write-Host ""

# 返回项目根目录
Set-Location "F:\CSFC"
