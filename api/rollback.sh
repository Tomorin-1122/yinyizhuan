#!/bin/bash

# 引易转 API 回溯脚本
# 此脚本将移除所有API相关文件，恢复到原始状态

echo "🔄 引易转 API 回溯脚本"
echo "======================"

# 确认操作
read -p "确定要移除所有API文件吗？(y/N): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "📦 备份当前状态..."
git stash push -m "备份API架构 $(date)"

echo ""
echo "🗑️  删除API目录..."
rm -rf api/

echo ""
echo "↩️  恢复vercel.json..."
git checkout vercel.json

echo ""
echo "✅ 回溯完成！"
echo ""
echo "📋 当前状态："
git status

echo ""
echo "💡 提示："
echo "  - 如果需要恢复API，使用: git stash pop"
echo "  - 查看备份列表: git stash list"
echo "  - 删除备份: git stash drop"
