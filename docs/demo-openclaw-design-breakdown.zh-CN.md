# demo-openclaw 设计资产拆解

## 文档目的

这份文档把 [demo-openclaw.html](/Users/joye/Desktop/md-to-html-slides/examples/demo-openclaw.html) 作为一个设计基准样板来拆解。

目的不是复刻这个 demo 的每一行代码。

目的有三个：

1. 解释它为什么比当前自动生成结果更好看
2. 区分哪些是可复用设计资产，哪些只是一次性 demo 排版
3. 决定哪些资产应该进入 `System Mode`

---

## 结论先行

`demo-openclaw` 好看，不是因为旧链路更先进，而是因为它本质上是：

> 一份人工 art-directed 的高保真样板。

它和当前系统生成结果的主要差异不是“模型好坏”，而是：

- 页面类型更多
- 版式密度更完整
- 组件更丰富
- 每页都有人为构图
- 内容本身就是为版式写的

因此正确做法不是“直接拿它对标当前自动输出”，而是：

> 把它拆成可复用设计资产，再逐步注入 `System Mode`

---

## 为什么它更好看

### 1. 页面类型非常明确

`demo-openclaw` 不是一组普通标题页。

它实际上有清晰的页面类型：

- `hero cover`
- `stage overview`
- `lesson timeline`
- `project grid`
- `next-step split layout`

这些页面类型之间差异很大，因此整套 deck 看起来更有节奏。

而当前自动生成结果的问题之一是：

- 页型虽然开始有 `hero / compare / metrics / process / cta`
- 但整体页面类型仍不够丰富
- 很多页面还是“标题 + 若干块”的变体

### 2. 信息密度更完整

`demo-openclaw` 的页面通常同时具备：

- eyebrow
- 标题
- 说明文本
- secondary cards
- tags / pills / stats / timeline / footer hint

也就是说，它不是靠一个标题撑满整页。

当前自动输出经常只有：

- 标题
- 一两组内容块

这会导致版式更容易显空。

### 3. 组件已经被手工设计过

这个 demo 里已经存在一批“完成度很高的小组件”：

- `pill`
- `stat-box`
- `feature-list`
- `timeline-item`
- `stage-card`
- `project-card`
- `footer-bar`

这些组件都有：

- 明确用途
- 一致的边框和背景策略
- 合理的节奏和密度

当前自动生成链路还没有这么完整的组件体系。

### 4. 页面有明显的“构图意图”

例如：

- hero 用 `hero-grid`
- 样例课用 `two-col`
- 成果页用 `projects-grid`
- 阶段概览用 `stages-grid`

这些不是随便堆元素，而是预先定义好的构图系统。

这正是当前自动输出最弱的一层。

---

## demo 里的核心设计资产

下面按资产类型拆解。

## 一、视觉基础资产

### A. 基础色彩系统

特征：

- 深色背景
- 一套中性色表层
- 多个语义强调色
  - gold
  - blue
  - green
  - pink
  - purple
  - danger

为什么有效：

- 整体不花
- 但能给不同卡片和阶段明显区分

进入 `System Mode` 的建议：

- `保留`
- 但不要直接原样照搬全部颜色
- 应抽象成：
  - neutral base
  - primary accent
  - semantic accent set

### B. 字体系统

特征：

- serif display for title
- sans for body
- mono for meta / label / code

为什么有效：

- 页面层级非常清楚
- 标题气质和正文阅读被拉开

进入 `System Mode` 的建议：

- `强烈保留`
- 这是最适合进入系统化 theme 的资产之一

### C. 页面 chrome

特征：

- progress bar
- nav dots
- slide index
- footer bar

为什么有效：

- 增强“正在看一份成品 deck”的感觉
- 页面不会像普通网页片段

进入 `System Mode` 的建议：

- `保留`
- 属于通用 deck chrome，适合系统化

---

## 二、页面构图资产

### A. `hero-grid`

用途：

- cover
- end slide
- hero + supporting card

价值：

- 标题和 supporting content 可以共存
- 不会只有一个大标题撑场

进入 `System Mode` 的建议：

- `必须进入`
- 应成为正式的 hero page layout

### B. `two-col`

用途：

- 左右对照
- 样例说明
- 内容结构 + 操作建议

价值：

- 非常适合 explainer / course / compare 类页面

进入 `System Mode` 的建议：

- `必须进入`
- 应成为 compare / lesson walkthrough 的正式 layout

### C. `projects-grid`

用途：

- 成果展示
- feature gallery
- capability wall

价值：

- 比普通 bullet 更适合展示“多项成果”

进入 `System Mode` 的建议：

- `建议进入`
- 适合 future 的 `results-grid` 或 `capability-grid` block

### D. `stages-grid`

用途：

- roadmap
- learning stages
- phase overview

价值：

- 比 bullet 更适合讲阶段和路径

进入 `System Mode` 的建议：

- `强烈建议进入`
- 它应该成为 future `roadmap / stages-overview` block

---

## 三、组件级资产

### A. `pill`

用途：

- 小型 meta summary
- 关键信号

价值：

- 在 hero 和 intro 页里非常有效
- 低成本提升完成度

进入 `System Mode` 的建议：

- `保留`
- 适合变成 hero supporting chips

### B. `stat-box`

用途：

- 简短指标
- 功能预览

价值：

- 比纯文字说明更容易形成节奏

进入 `System Mode` 的建议：

- `保留`
- 可以和 metrics block 合并演化

### C. `feature-list`

用途：

- 普通 bullet 的增强版

价值：

- 提升可读性
- 视觉完成度比裸 list 强

进入 `System Mode` 的建议：

- `保留`
- 应作为 default bullet layout 的优化方向

### D. `timeline-item`

用途：

- 步骤
- 课程拆分
- next step

价值：

- 对顺序型内容特别有效

进入 `System Mode` 的建议：

- `必须进入`
- 应成为 process / lesson timeline block 的基础

### E. `stage-card`

用途：

- 阶段型 overview

价值：

- 用颜色区分阶段
- 在 overview 页非常强

进入 `System Mode` 的建议：

- `建议进入`
- 但只在 roadmap/stage overview 页面使用

### F. `project-card`

用途：

- 项目展示
- 核心成果

价值：

- 对“成果页”比 bullet 强很多

进入 `System Mode` 的建议：

- `建议进入`
- 但优先级低于 hero / timeline / stages

---

## 哪些不应该直接进入 System Mode

### 1. demo 的完整页面文案

原因：

- 这些文案本身就是为 demo 写的
- 不能作为系统默认输出标准

### 2. 所有布局一次性全部进入

原因：

- 当前 `System Mode` 还在收敛期
- 一次性加太多布局会把系统复杂度拉高

### 3. 依赖强人工构图的局部细节

例如：

- 某一页非常手工定制的比例
- 某一页特定的词长、内容节奏

这些更适合作为设计参考，而不是先进入生成系统。

---

## 当前推荐进入 System Mode 的资产优先级

### P0：必须进入

- `hero-grid`
- `two-col`
- `timeline-item / process timeline`
- `feature-list` 的增强型 bullet 表达
- 基础 deck chrome

### P1：建议进入

- `stages-grid`
- `pill`
- `stat-box`

### P2：后续考虑

- `project-card / results-grid`
- 更复杂的成果墙

---

## 对当前开发路线的影响

这份拆解意味着：

### 当前不应该继续做的事

- 继续只修单个 theme 的局部 CSS
- 继续拿普通 bullet 页去硬追 demo 效果
- 继续只从 prompt 形容词里追审美

### 当前应该做的事

1. 把 `hero-grid`、`two-col`、`timeline` 抽成系统资产
2. 让 semantic visual block 可以驱动这些 layout
3. 用 `demo-openclaw` 作为设计基准，而不是当成“旧系统真实能力”

---

## 最终判断

`demo-openclaw` 的价值，不在于它证明“以前系统更强”。

它真正的价值在于：

> 它是一份已经完成 art direction 的参考样板，适合被拆成可复用设计资产，再逐步进入 `System Mode`。
