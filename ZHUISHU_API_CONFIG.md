# 追书神器API域名配置说明

## ⚠️ 重要：配置request合法域名

使用追书神器API前，需要在微信公众平台配置以下域名白名单：

### 📝 配置步骤

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入：**开发 → 开发管理 → 开发设置 → 服务器域名**
3. 在 **request合法域名** 中添加（必须带https://）：

```
https://api.zhuishushenqi.com
https://api05iye5.zhuishushenqi.com
https://chapterup.zhuishushenqi.com
```

> ⚠️ 注意：域名格式必须是 `https://域名`，不能只写域名部分

### 💡 开发阶段临时方案

如果暂时无法配置域名，可以在**微信开发者工具**中：

1. 点击右上角 **详情**
2. 勾选 **不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书**

> ⚠️ 注意：此选项仅在开发工具中有效，真机预览和正式发布时必须配置域名白名单

---

## 📚 追书神器API说明

### 接口列表

#### 1. 模糊搜索
```
GET https://api.zhuishushenqi.com/book/fuzzy-search?query=关键词
```

#### 2. 获取书籍信息
```
GET https://api.zhuishushenqi.com/book/{bookId}
```

#### 3. 获取章节列表
```
GET https://api.zhuishushenqi.com/mix-atoc/{bookId}?view=chapters
```

#### 4. 获取章节内容
```
GET https://chapterup.zhuishushenqi.com/chapter/{chapterLink}
```

### 返回数据结构

#### 搜索结果
```json
{
  "books": [
    {
      "_id": "书籍ID",
      "title": "书名",
      "author": "作者",
      "shortIntro": "简介",
      "cover": "封面URL",
      "lastChapter": "最新章节",
      "tags": ["标签1", "标签2"],
      "wordCount": 字数
    }
  ]
}
```

#### 章节列表
```json
{
  "mixToc": {
    "_id": "源ID",
    "chapters": [
      {
        "title": "章节标题",
        "link": "章节链接",
        "unreadble": false
      }
    ]
  }
}
```

#### 章节内容
```json
{
  "chapter": {
    "title": "章节标题",
    "body": "章节内容",
    "cpContent": "备用内容"
  }
}
```

---

## ⚙️ 代码实现

已在 `miniprogram/utils/novelApi.js` 中实现：

- ✅ **searchNovel()**: 模糊搜索小说
- ✅ **getChapterList()**: 获取章节列表
- ✅ **getChapterContent()**: 获取章节内容
- ✅ **API自动切换**: 请求失败时自动切换备用地址

---

## 🔧 故障排查

### 问题1: 搜索无结果
**原因**: API地址被墙或域名未配置
**解决**: 
1. 检查开发工具是否勾选「不校验合法域名」
2. 尝试切换到备用API地址
3. 检查网络连接

### 问题2: 章节内容为空
**原因**: 章节链接失效或编码问题
**解决**:
1. 检查章节link是否完整
2. 确认章节未被删除
3. 尝试刷新章节列表

### 问题3: 封面图片不显示
**原因**: 图片域名未配置或CDN失效
**解决**:
1. 封面URL需要配置到 downloadFile合法域名
2. 或使用默认封面

---

## 📌 注意事项

1. **API稳定性**: 追书神器为第三方API，可能存在不稳定情况
2. **请求频率**: 避免频繁请求，建议加入本地缓存
3. **内容版权**: 仅供学习交流，请勿用于商业用途
4. **备用方案**: 准备多个API地址以提高可用性

---

## 🚀 测试建议

1. 先在开发工具测试搜索功能
2. 确认章节列表能正常加载
3. 测试章节内容的格式化效果
4. 检查阅读进度保存功能
5. 真机预览前务必配置域名白名单

---

## 📖 相关文档

- [追书神器API文档](https://github.com/zimplexing/vue-nReader/blob/master/doc/zhuishushenqi.md)
- [微信小程序网络请求文档](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [服务器域名配置文档](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
