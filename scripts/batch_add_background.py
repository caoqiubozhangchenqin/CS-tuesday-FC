#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量为小程序页面添加背景图支持
"""

import os
import re

# 页面列表（index和ranking已完成）
pages = [
    'admin/admin',
    'captain_panel/captain_panel',
    'registration_status/registration_status',
    'result/result',
    'schedule/schedule',
    'standings/standings',
    'survey/survey',
    'team_signup/team_signup',
    'team_status/team_status'
]

pages_dir = os.path.join(os.path.dirname(__file__), '../miniprogram/pages')

def add_background_to_js(file_path):
    """为JS文件添加背景图支持"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已添加
    if 'globalBgUrl' in content:
        print(f"  ✓ {os.path.basename(file_path)} 已有背景图支持")
        return False
    
    # 1. 在data中添加globalBgUrl
    content = re.sub(
        r'(data:\s*\{[^}]*?)(\n\s*\})',
        r'\1,\n    globalBgUrl: \'\'\2',
        content,
        count=1
    )
    
    # 2. 在onLoad开头添加背景设置
    content = re.sub(
        r'(onLoad:\s*function\s*\([^)]*\)\s*\{)',
        r'\1\n    getApp().setPageBackground(this);',
        content,
        count=1
    )
    
    # 3. 添加onShow方法
    onshow_code = '''
  onShow: function() {
    if (!this.data.globalBgUrl) {
      setTimeout(() => {
        const app = getApp();
        if (app.globalData.globalBackgroundImageUrl) {
          this.setData({ globalBgUrl: app.globalData.globalBackgroundImageUrl });
        }
      }, 100);
    }
  },
'''
    
    # 在onLoad后面添加onShow
    content = re.sub(
        r'(onLoad:\s*function\s*\([^)]*\)\s*\{[^}]*\},)',
        r'\1' + onshow_code,
        content,
        count=1
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ 已更新 {os.path.basename(file_path)}")
    return True

def add_background_to_wxml(file_path):
    """为WXML文件添加背景图容器"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已添加
    if 'page-background' in content:
        print(f"  ✓ {os.path.basename(file_path)} 已有背景图")
        return False
    
    # 在文件开头添加背景容器
    bg_view = '<view class="page-background" style="background-image: url({{globalBgUrl}});"></view>\n\n'
    content = bg_view + content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ 已更新 {os.path.basename(file_path)}")
    return True

# 处理每个页面
for page in pages:
    print(f"\n处理页面: {page}")
    
    js_file = os.path.join(pages_dir, f"{page}.js")
    wxml_file = os.path.join(pages_dir, f"{page}.wxml")
    
    if os.path.exists(js_file):
        try:
            add_background_to_js(js_file)
        except Exception as e:
            print(f"  ✗ 处理 {page}.js 失败: {e}")
    else:
        print(f"  ✗ 文件不存在: {js_file}")
    
    if os.path.exists(wxml_file):
        try:
            add_background_to_wxml(wxml_file)
        except Exception as e:
            print(f"  ✗ 处理 {page}.wxml 失败: {e}")
    else:
        print(f"  ✗ 文件不存在: {wxml_file}")

print("\n\n✅ 批量添加完成！")
