@echo off
echo ========================================
echo 部署 updateBugStatus 云函数
echo ========================================

echo 正在检查云函数文件...
if not exist "cloudfunctions\updateBugStatus\index.js" (
    echo ❌ 错误：找不到云函数文件
    pause
    exit /b 1
)

echo ✅ 云函数文件存在
echo.

echo 请确保您已经：
echo 1. 安装了 wx-server-sdk
echo 2. 配置了正确的环境变量
echo 3. 登录了微信开发者工具
echo.

set /p envId="请输入您的云开发环境ID: "
if "%envId%"=="" (
    echo ❌ 环境ID不能为空
    pause
    exit /b 1
)

echo.
echo 正在部署云函数到环境: %envId%
echo.

wx-server-sdk deploy --env %envId% --path cloudfunctions\updateBugStatus

if %errorlevel% equ 0 (
    echo.
    echo ✅ 云函数部署成功！
    echo.
    echo 现在您可以：
    echo 1. 重新编译小程序
    echo 2. 以管理员身份测试bug状态更新功能
    echo.
) else (
    echo.
    echo ❌ 部署失败
    echo 请检查：
    echo 1. 网络连接
    echo 2. 环境ID是否正确
    echo 3. wx-server-sdk是否正确安装
    echo 4. 是否已登录微信开发者工具
    echo.
)

pause