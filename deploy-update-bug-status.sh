#!/bin/bash

# 部署updateBugStatus云函数的脚本
# 使用方法: ./deploy-update-bug-status.sh

echo "开始部署updateBugStatus云函数..."

# 检查参数
if [ -z "$1" ]; then
    echo "用法: $0 <envId>"
    echo "例如: $0 your-env-id"
    exit 1
fi

envId=$1
projectPath=$(pwd)

echo "环境ID: $envId"
echo "项目路径: $projectPath"

# 部署云函数
echo "正在部署updateBugStatus云函数..."
${installPath} cloud functions deploy --e ${envId} --n updateBugStatus --r --project ${projectPath}

if [ $? -eq 0 ]; then
    echo "✅ updateBugStatus云函数部署成功！"
    echo ""
    echo "现在您可以："
    echo "1. 重新编译小程序"
    echo "2. 以管理员身份进入bug提交页面"
    echo "3. 测试bug状态更新功能"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi