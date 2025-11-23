# 修复 WXML 模板表达式错误

## 🐛 问题描述

在 `reader-v2.wxml` 中使用了复杂的 JavaScript 表达式：

```xml
<!-- ❌ 错误：WXML 不支持复杂表达式 -->
<text>阅读进度：{{((currentPage / totalPages) * 100).toFixed(1)}}%</text>
```

**错误信息**：
```
Bad value with message: unexpected token `.`.
at files://miniprogram\pages\novel\reader-v2\reader-v2.wxml#46
```

---

## 🔍 根本原因

**微信小程序 WXML 模板限制**：

WXML 模板中只支持简单的数据绑定和基础运算符，**不支持**：
- ❌ 方法调用（如 `.toFixed()`, `.substring()`, `.join()`）
- ❌ 三元运算符嵌套
- ❌ 复杂的数学计算

**支持的表达式**：
- ✅ 简单的算术运算：`{{a + b}}`
- ✅ 简单的比较：`{{a > b}}`
- ✅ 逻辑运算：`{{a && b}}`
- ✅ 三元运算符（简单）：`{{a ? b : c}}`

---

## ✅ 解决方案

### 1. 在 JS 中计算好数据

**原则**：复杂计算都在 JS 中完成，模板中只做数据展示。

#### 修改 `reader-v2.js`

**新增 data 字段**：
```javascript
data: {
  progressPercent: 0,  // 进度百分比（已计算好）
  // ... 其他字段
}
```

**在所有更新页码的地方计算百分比**：

##### a) 加载小说信息时
```javascript
loadNovelInfo() {
  this.setData({
    novelInfo: res.data,
    totalPages: res.data.totalPages,
    pageIndicator: `1/${res.data.totalPages}`,
    progressPercent: 0  // ✅ 初始化为 0
  });
}
```

##### b) 恢复阅读进度时
```javascript
loadProgress() {
  const pageNum = progress.currentPage || 0;
  const percent = this.data.totalPages > 0 
    ? ((pageNum / this.data.totalPages) * 100).toFixed(1)
    : 0;
  
  this.setData({
    currentPage: pageNum,
    progressPercent: percent  // ✅ 计算并保存
  });
}
```

##### c) 翻页时
```javascript
onPageChange(e) {
  const newPageIndex = ...;
  const percent = this.data.totalPages > 0 
    ? ((newPageIndex / this.data.totalPages) * 100).toFixed(1)
    : 0;
  
  this.setData({
    currentPage: newPageIndex,
    progressPercent: percent  // ✅ 每次翻页都更新
  });
}
```

##### d) 拖动进度条时
```javascript
onSliderChange(e) {
  const newPage = e.detail.value;
  const percent = this.data.totalPages > 0 
    ? ((newPage / this.data.totalPages) * 100).toFixed(1)
    : 0;
  
  this.setData({
    currentPage: newPage,
    progressPercent: percent  // ✅ 更新百分比
  });
  
  this.loadContent();
}
```

##### e) 跳转页码时
```javascript
jumpToPage() {
  const newPage = pageNum - 1;
  const percent = this.data.totalPages > 0 
    ? ((newPage / this.data.totalPages) * 100).toFixed(1)
    : 0;
  
  this.setData({
    currentPage: newPage,
    progressPercent: percent  // ✅ 更新百分比
  });
}
```

---

### 2. 修改 WXML 模板

**修改前**：
```xml
<!-- ❌ 错误 -->
<text>阅读进度：{{((currentPage / totalPages) * 100).toFixed(1)}}%</text>
```

**修改后**：
```xml
<!-- ✅ 正确 -->
<text>阅读进度：{{progressPercent}}%</text>
```

---

### 3. 新增缺失的方法

#### a) `doNothing()` 方法
```javascript
/**
 * 阻止事件冒泡（空函数）
 */
doNothing() {
  // 阻止事件冒泡
}
```

**用途**：在菜单面板内部点击时，阻止事件冒泡到外层（避免误关闭菜单）

**使用**：
```xml
<view class="menu-content" catchtap="doNothing">
  <!-- 菜单内容 -->
</view>
```

#### b) `onSliderChange()` 方法
```javascript
/**
 * 进度条拖动
 */
onSliderChange(e) {
  const newPage = e.detail.value;
  const percent = (newPage / this.data.totalPages * 100).toFixed(1);
  
  this.setData({ 
    currentPage: newPage,
    progressPercent: percent
  });
  
  this.loadContent();
}
```

**用途**：处理用户拖动进度条的事件

---

## 📋 完整修改清单

### 修改的文件

#### 1. `reader-v2.js`
- ✅ data 中新增 `progressPercent: 0`
- ✅ `loadNovelInfo()` 中初始化 progressPercent
- ✅ `loadProgress()` 中计算并设置 progressPercent
- ✅ `onPageChange()` 中更新 progressPercent
- ✅ 新增 `doNothing()` 方法
- ✅ 新增 `onSliderChange()` 方法
- ✅ `jumpToPage()` 中更新 progressPercent

#### 2. `reader-v2.wxml`
- ✅ 将 `{{((currentPage / totalPages) * 100).toFixed(1)}}` 改为 `{{progressPercent}}`

---

## ✅ 验证修复

### 编译测试
1. 保存所有文件
2. 在开发者工具中点击「编译」
3. 查看控制台，不应该再有 WXML 编译错误

### 功能测试
1. 打开阅读器页面
2. 点击屏幕中央，弹出菜单
3. 查看进度条上方的百分比显示是否正常
4. 拖动进度条，百分比应该实时更新
5. 翻页时，百分比应该同步变化

---

## 📚 最佳实践

### WXML 模板使用原则

1. **简单数据绑定**
   ```xml
   <!-- ✅ 推荐 -->
   <text>{{username}}</text>
   <text>{{age}}岁</text>
   ```

2. **简单运算**
   ```xml
   <!-- ✅ 可以使用 -->
   <text>{{price * quantity}}</text>
   <text>{{a + b + c}}</text>
   ```

3. **复杂计算在 JS 中完成**
   ```javascript
   // ✅ 在 JS 中计算
   data: {
     totalPrice: 0
   },
   
   calcTotal() {
     const total = this.data.items.reduce((sum, item) => {
       return sum + item.price * item.quantity;
     }, 0).toFixed(2);
     
     this.setData({ totalPrice: total });
   }
   ```
   
   ```xml
   <!-- 模板中直接使用 -->
   <text>总价：￥{{totalPrice}}</text>
   ```

4. **格式化数据**
   ```javascript
   // ✅ 在 JS 中格式化
   formatDate(timestamp) {
     const date = new Date(timestamp);
     return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
   }
   
   this.setData({
     dateStr: this.formatDate(Date.now())
   });
   ```
   
   ```xml
   <!-- 模板中使用格式化后的数据 -->
   <text>{{dateStr}}</text>
   ```

---

## 🎯 关键要点

1. **WXML 不是 JavaScript**
   - WXML 是类似 HTML 的标记语言
   - 只支持非常基础的表达式
   - 复杂逻辑必须在 JS 中处理

2. **数据驱动视图**
   - 在 JS 中计算好所有需要的数据
   - 通过 `setData()` 更新到视图
   - 模板中只负责展示

3. **性能考虑**
   - 避免在模板中进行复杂计算
   - 预先计算好数据可以提升渲染性能
   - 减少不必要的 setData 调用

---

## 🔗 参考文档

- [微信小程序 WXML 语法参考](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/)
- [数据绑定](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/data.html)

---

**修复完成时间**：2025-01-23  
**问题类型**：WXML 模板语法限制  
**解决方法**：将复杂计算移到 JS 中处理
