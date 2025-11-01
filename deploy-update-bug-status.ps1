# 部署 updateBugStatus 云函数的 PowerShell 脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署 updateBugStatus 云函数" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查云函数文件
$functionPath = "cloudfunctions\updateBugStatus\index.js"
if (!(Test-Path $functionPath)) {
    Write-Host "❌ 错误：找不到云函数文件 $functionPath" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host "✅ 云函数文件存在" -ForegroundColor Green
Write-Host ""

Write-Host "请确保您已经：" -ForegroundColor Yellow
Write-Host "1. 安装了 wx-server-sdk" -ForegroundColor Yellow
Write-Host "2. 配置了正确的环境变量" -ForegroundColor Yellow
Write-Host "3. 登录了微信开发者工具" -ForegroundColor Yellow
Write-Host ""

$envId = Read-Host "请输入您的云开发环境ID"

if ([string]::IsNullOrEmpty($envId)) {
    Write-Host "❌ 环境ID不能为空" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""
Write-Host "正在部署云函数到环境: $envId" -ForegroundColor Cyan
Write-Host ""

try {
    # 部署云函数
    & wx-server-sdk deploy --env $envId --path cloudfunctions\updateBugStatus

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 云函数部署成功！" -ForegroundColor Green
        Write-Host ""
        Write-Host "现在您可以：" -ForegroundColor Cyan
        Write-Host "1. 重新编译小程序" -ForegroundColor Cyan
        Write-Host "2. 以管理员身份测试bug状态更新功能" -ForegroundColor Cyan
        Write-Host ""
    } else {
        throw "部署命令执行失败"
    }
} catch {
    Write-Host ""
    Write-Host "❌ 部署失败" -ForegroundColor Red
    Write-Host "请检查：" -ForegroundColor Red
    Write-Host "1. 网络连接" -ForegroundColor Red
    Write-Host "2. 环境ID是否正确" -ForegroundColor Red
    Write-Host "3. wx-server-sdk是否正确安装" -ForegroundColor Red
    Write-Host "4. 是否已登录微信开发者工具" -ForegroundColor Red
    Write-Host ""
}

Read-Host "按任意键退出"