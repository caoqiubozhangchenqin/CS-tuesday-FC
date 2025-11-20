# CSFC 小程序 Git 上传前安全检查脚本
# 运行方法：在 PowerShell 中执行 .\pre-upload-check.ps1

Write-Host "🔍 开始安全检查..." -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false

# 检查 1: .gitignore 是否存在
Write-Host "📋 检查 1: .gitignore 文件" -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "✅ .gitignore 文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ .gitignore 文件不存在！" -ForegroundColor Red
    $hasErrors = $true
}
Write-Host ""

# 检查 2: env.js 是否会被上传
Write-Host "📋 检查 2: env.js 是否排除" -ForegroundColor Yellow
$gitFiles = git ls-files 2>$null
if ($gitFiles -like "*config/env.js*") {
    Write-Host "❌ 警告：env.js 可能会被上传！" -ForegroundColor Red
    $hasErrors = $true
} else {
    Write-Host "✅ env.js 已被正确排除" -ForegroundColor Green
}
Write-Host ""

# 检查 3: 搜索敏感信息
Write-Host "📋 检查 3: 扫描敏感信息" -ForegroundColor Yellow

$sensitivePatterns = @(
    @{ Name = "ALAPI Token"; Pattern = "vkomdiv5oewmjg2jfqyxbjxjsrggdr" },
    @{ Name = "云环境ID"; Pattern = "cloud1-3ge5gomsffe800a7" },
    @{ Name = "真实AppID"; Pattern = "wxb0112230d1040cf5" },
    @{ Name = "管理员OpenID"; Pattern = "oVAxOvrDAY9Q0qG8WBnRxO3_m1nw" }
)

foreach ($item in $sensitivePatterns) {
    $found = git grep -l $item.Pattern 2>$null
    if ($found -and $found -ne "miniprogram/config/env.js") {
        Write-Host "❌ 发现 $($item.Name) 在以下文件中:" -ForegroundColor Red
        $found | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
        $hasErrors = $true
    } else {
        Write-Host "✅ 未发现 $($item.Name) 泄露" -ForegroundColor Green
    }
}
Write-Host ""

# 检查 4: project.config.json 中的 AppID
Write-Host "📋 检查 4: project.config.json" -ForegroundColor Yellow
$projectConfig = Get-Content "project.config.json" -Raw | ConvertFrom-Json
if ($projectConfig.appid -like "wx*" -and $projectConfig.appid -ne "wxYOUR_APPID_HERE") {
    Write-Host "⚠️  project.config.json 包含真实 AppID: $($projectConfig.appid)" -ForegroundColor Yellow
    Write-Host "   建议修改为占位符: wxYOUR_APPID_HERE" -ForegroundColor Yellow
} else {
    Write-Host "✅ project.config.json 已使用占位符" -ForegroundColor Green
}
Write-Host ""

# 检查 5: 暂存区状态
Write-Host "📋 检查 5: Git 暂存区状态" -ForegroundColor Yellow
$stagedFiles = git diff --cached --name-only 2>$null
if ($stagedFiles) {
    Write-Host "ℹ️  已暂存的文件：" -ForegroundColor Cyan
    $stagedFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Cyan }
} else {
    Write-Host "ℹ️  暂存区为空（运行 git add . 添加文件）" -ForegroundColor Cyan
}
Write-Host ""

# 检查 6: 大文件检查
Write-Host "📋 检查 6: 大文件扫描" -ForegroundColor Yellow
Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 10MB } | ForEach-Object {
    Write-Host "⚠️  发现大文件: $($_.FullName) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor Yellow
}
Write-Host "✅ 大文件检查完成" -ForegroundColor Green
Write-Host ""

# 总结
Write-Host "=" * 60 -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "❌ 检查未通过！请修复上述问题后再上传。" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 修复建议：" -ForegroundColor Yellow
    Write-Host "   1. 确保 .gitignore 正确配置" -ForegroundColor White
    Write-Host "   2. 删除代码中的硬编码敏感信息" -ForegroundColor White
    Write-Host "   3. 使用配置文件 (env.js) 管理密钥" -ForegroundColor White
    Write-Host "   4. 修改 project.config.json 中的 AppID" -ForegroundColor White
    exit 1
} else {
    Write-Host "✅ 所有检查通过！可以安全上传。" -ForegroundColor Green
    Write-Host ""
    Write-Host "📤 执行以下命令上传到 Git：" -ForegroundColor Cyan
    Write-Host "   git add ." -ForegroundColor White
    Write-Host "   git commit -m '🎉 Initial commit: CSFC 足球俱乐部小程序'" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/您的用户名/CSFC.git" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
    exit 0
}
