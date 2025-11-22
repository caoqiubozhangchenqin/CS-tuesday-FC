@echo off
chcp 65001 >nul
echo ============================================
echo   添加《我 中国队长》到书架 - 快速部署
echo ============================================
echo.

echo [步骤 1/3] 进入云函数目录...
cd /d "%~dp0cloudfunctions\addBookToShelf"
if errorlevel 1 (
    echo ❌ 错误：无法找到云函数目录
    pause
    exit /b 1
)

echo [步骤 2/3] 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 错误：npm install 失败
    pause
    exit /b 1
)

echo [步骤 3/3] 完成！
echo.
echo ============================================
echo ✅ 云函数准备完成
echo ============================================
echo.
echo 📝 接下来的步骤：
echo.
echo 1. 在微信开发者工具中右键点击 addBookToShelf 文件夹
echo 2. 选择"上传并部署：云端安装依赖"
echo 3. 等待部署完成
echo 4. 在控制台执行以下代码添加书籍：
echo.
echo    wx.cloud.callFunction({
echo      name: 'addBookToShelf',
echo      data: {
echo        name: '我 中国队长',
echo        author: '未知作者',
echo        intro: '一本超过10MB的大型小说',
echo        category: '未分类',
echo        format: 'TXT',
echo        fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
echo        cloudPath: '小说/我 中国队长.txt',
echo        size: 10485760,
echo        sizeText: '> 10 MB'
echo      }
echo    }).then(res => console.log(res))
echo.
echo ============================================
pause
