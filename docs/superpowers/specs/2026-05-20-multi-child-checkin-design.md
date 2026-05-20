# 多子女打卡工具升级设计

> 日期：2026-05-20
> 状态：已确认，待实施

## 概述

将现有单孩子打卡应用升级为支持多子女独立管理的版本，新增全家排行榜、数据备份、PWA 支持，保持纯前端静态部署（GitHub Pages 免费）。

## 核心决策

| 决策点 | 结论 |
|--------|------|
| 存储方案 | localStorage 本地存储（增强版），支持 JSON 导出/导入备份 |
| 多子女模型 | 完全独立（每个孩子独立的任务、星星、愿望、勋章、历史） |
| 切换方式 | 每个页面 Header 左侧头像切换器，点击弹出 Bottom Sheet |
| 排行榜 | 新增页面，支持星星总数/连续天数/本周完成 三维度 |
| 星星机制 | 拆分 stars（余额，可兑换）和 totalStarsEarned（累计，排行用） |
| 部署 | GitHub Pages 静态部署，HTTPS |
| PWA | manifest.json + Service Worker，可安装到主屏幕 |

## Section 1：数据结构

### 新格式

```js
// localStorage key: 'checkin_app_data'
{
  currentChildId: "child_1716000000000",
  children: [
    {
      id: "child_1716000000000",
      name: "大宝",
      avatar: "👧",
      tasks: [
        { id: 1, name: '语文朗读', icon: '📖', default: true },
        // ...
      ],
      todayCheckin: { date: '', completed: [] },
      cycleStarEarned: false,
      stars: 0,                // 当前余额（兑换扣减）
      totalStarsEarned: 0,     // 累计获得（只增不减，排行榜用）
      starHistory: [],
      wishes: [...],
      customWishes: [],
      exchangedWishes: [],
      medals: [],
      checkinRecords: {},
      settings: { reminderTime: '19:00', reminderEnabled: false }
    }
  ]
}
```

### 星星双轨规则

| 场景 | stars（余额） | totalStarsEarned（总收入） |
|------|--------------|--------------------------|
| 完成全部作业 +1 | +1 | +1 |
| 连续打卡奖励 | +N | +N |
| 兑换愿望 -X | -X | 不变 |

### API 变更

- `getData()` → 返回当前选中孩子的数据
- `getAppData()` → 返回整体结构（含 children 数组）
- `switchChild(id)` → 切换当前孩子
- `addChild(name, avatar)` → 新增孩子
- `removeChild(id)` → 删除孩子（至少保留一个）
- `getCurrentChild()` → 返回当前孩子对象
- `migrateOldData(raw)` → 老数据自动迁移

### 老数据迁移

检测到旧格式（有 `childName` 无 `children`）时自动包装为新结构，`totalStarsEarned` 初始值 = 当前 `stars`。迁移后立即写回。

## Section 2：头像切换器 UI

### Header 改造

所有页面统一 Header：左侧头像（40px 圆形，白边+阴影）+ 名字 + 下拉箭头，点击触发切换面板。

### Bottom Sheet 切换面板

- 从底部滑出（`translateY(100%) → 0`，300ms ease-out）
- 毛玻璃遮罩（`backdrop-filter: blur(6px); background: rgba(0,0,0,0.3)`）
- Sheet 圆角 `20px 20px 0 0`，顶部拖拽条
- 每个孩子一张卡片：头像 + 名字 + 副标题（连续打卡/今日状态 + 星星数）
- 当前选中：左侧 3px 渐变色竖条
- 底部"➕ 添加宝贝"虚线卡片

### 孩子管理

- 添加：全屏 Modal，emoji 网格选择器（12 个预设）+ 名字输入
- 编辑/删除：左滑卡片露出操作按钮（iOS 风格）
- 最后一个孩子不允许删除

## Section 3：全家排行榜

### 新增页面 `pages/rank.html`

### 结构

1. **维度切换 Tabs**：⭐ 星星总数 | 🔥 连续天数 | 📅 本周完成
2. **排名卡片列表**：
   - 第一名：大卡片 + 渐变背景 + 64px 头像 + 皇冠
   - 其他：标准卡片 + 48px 头像
   - 单孩子时：显示引导态
3. **全家成就面板**：总星星 / 总打卡次数 / 总勋章

### 排序数据源

| Tab | 数据 |
|-----|------|
| ⭐ 星星总数 | `child.totalStarsEarned` 降序 |
| 🔥 连续天数 | `getConsecutiveDays(child)` 降序 |
| 📅 本周完成 | 本周 checkinRecords 打卡次数降序 |

### 激励彩蛋（可选）

被超过的孩子首页显示："大宝已经超过你啦，加油！💪"

## Section 4：数据备份

### 导出

- 家长中心「导出数据」按钮
- 生成 JSON 文件触发下载：`打卡数据_2026-05-20.json`

### 导入

- 家长中心「导入数据」按钮
- 文件选择器 → 确认弹窗 → 覆盖写入 → 刷新

### 分享链接（降级保留）

- 仅分享当前孩子数据（轻量场景）
- 大数据量时建议用导出/导入

## Section 5：PWA

### manifest.json

```json
{
  "name": "宝贝打卡乐园",
  "short_name": "打卡乐园",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#fcfaff",
  "theme_color": "#ffe6f0",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (sw.js)

- 缓存所有静态资源
- 离线完全可用
- 版本更新时清旧缓存

## Section 6：全局设计规范升级

### CSS 变量体系

```css
:root {
  --color-primary: #ff8fab;
  --color-bg: #fcfaff;
  --color-card: #ffffff;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --font-family: system-ui, -apple-system, "SF Pro", "PingFang SC", sans-serif;
}
```

### 组件统一

- 弹窗全部改为 Bottom Sheet / 全屏 Modal 模式
- 不再使用 `prompt()` / `alert()`
- Tab 切换动画统一下划线滑动

## 文件结构

```
flag/
├── index.html              ← 改造
├── manifest.json           ← 新增
├── sw.js                   ← 新增
├── icon-192.png            ← 新增
├── icon-512.png            ← 新增
├── pages/
│   ├── checkin.html        ← 改造
│   ├── stars.html          ← 改造
│   ├── rank.html           ← 新增
│   ├── mine.html           ← 改造
│   ├── css/
│   │   └── style.css       ← 改造
│   └── js/
│       └── app.js          ← 改造
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-20-multi-child-checkin-design.md
```

## 改动范围

| 文件 | 类型 | 工作量 |
|------|------|--------|
| app.js | 重构数据层 + 切换/迁移/排行/备份 | 大 |
| style.css | CSS 变量 + Bottom Sheet + 排行榜 | 大 |
| index.html | Header 切换器 + 4Tab 导航 | 中 |
| checkin.html | Header + 导航栏 | 小 |
| stars.html | Header + 导航栏 | 小 |
| mine.html | 导出/导入 + 导航栏 | 中 |
| rank.html | 全新页面 | 中 |
| manifest.json + sw.js | 全新 | 小 |

## 部署

- GitHub Pages，推 main 分支自动部署
- HTTPS 自动启用（满足 PWA 要求）
- 零服务器成本
