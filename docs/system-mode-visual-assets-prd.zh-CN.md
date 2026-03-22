# System Mode 视觉资产层优化 PRD

## 文档目的

这份 PRD 用于定义 `md-to-html-slides` 下一阶段在 `System Mode` 下的视觉资产层优化目标。

它不讨论 `Art Mode` 实现。
它也不讨论自由生成 HTML。

这份文档要解决的问题是：

> 在不破坏当前稳定主链路的前提下，如何让 `System Mode` 产出的 HTML 在组件、颜色层次、图标和视觉完成度上明显提升。

---

## 一句话结论

当前问题已经不只是“排版是否成立”，而是：

> `System Mode` 已经有了初步的结构语义，但还缺一层稳定可复用的视觉资产系统。

这意味着，后续优化方向不应再是继续盲修 theme，而应当是：

1. 明确 `System Mode` 能稳定支持哪些组件
2. 把这些组件纳入 semantic contract
3. 再让 theme 去消费这些组件

---

## 什么是 System Mode

`System Mode` 是当前项目的默认产品模式。

它的核心目标不是生成一次性惊艳作品，而是：

- 稳定地把内容转成展示结构
- 保持可确认、可复用、可维护
- 通过确定性的渲染层输出 HTML

当前理想主链路是：

`Markdown -> Plan -> Clarification -> Outline Confirmation -> Expand -> Semantic Blocks -> Theme Renderer -> HTML`

对用户来说，`System Mode` 的价值是：

- 用户给内容
- 系统帮助决定怎么拆页
- 系统帮助把文稿语言改成展示语言
- 系统给出一个稳定可继续迭代的 HTML 结果

换句话说：

> `System Mode` 是一个稳定展示结构系统，不是自由设计生成器。

---

## 当前 System Mode 有什么

当前已具备的能力包括：

### 1. 主链路

- `Markdown -> Plan -> Clarification -> Outline Confirmation -> Expand -> HTML`

### 2. 稳定系统能力

- cache
- fallback
- state flow
- normalize
- deterministic renderer
- CLI / Studio / shared contract

### 3. 已进入系统的页面语义

当前已经具备或开始具备的 semantic visual block：

- `hero`
- `compare`
- `metrics`
- `process`
- `summary`
- `cta`

### 4. 已进入系统的布局资产

当前已经开始进入 `System Mode` 的 demo 资产：

- `hero-grid`
- `two-col`（先覆盖 compare）

### 5. 已有主题体系

当前已有 theme：

- `dark-card`
- `tech-launch`
- `editorial-light`

这些 theme 已经能承载基础结构，但还没有完整的组件资产层。

---

## 当前 System Mode 的主要问题

当前问题不是“完全不好看”，而是“已经有结构，但视觉资产层明显不够”。

核心问题如下：

### 1. 组件系统不够完整

当前页面里仍缺少稳定可复用的组件，例如：

- `tag chips`
- `primary CTA / secondary CTA`
- `icon tile`
- `status mark`
- `feature card`
- `scenario card`

结果是：

- 页面虽然有 layout
- 但很难达到更完整的产品页面完成度

### 2. 颜色语义太弱

当前虽然有 accent 色，但还不够支持：

- 主次按钮区分
- 标签层级区分
- status 正负反馈
- 卡片之间的语义差异

结果是：

- 页面颜色虽然不难看
- 但容易显得单一、克制过头

### 3. 图标系统太薄

当前问题包括：

- 图标数量少
- 同类页面图标重复
- 图标和内容语义绑定不够强

结果是：

- 图标只能做轻装饰
- 还不能承担信息提示作用

### 4. 缺乏微型图形资产

例如：

- sparkline
- mini bars
- relation arrow
- structure node
- abstract diagram

结果是：

- 页面虽然有版式
- 但中间层视觉信息不足
- 容易出现“排得对，但看起来还空”

### 5. image slot 尚未正式系统化

当前系统虽然支持 Markdown 图片，但还没有在语义层明确这些内容：

- 哪种页适合放图
- 图像位怎么与标题和要点共存
- 没有图时如何优雅退化

### 6. 内容密度与视觉资产层脱节

当前很多页面的问题不是结构错，而是：

- 有标题
- 有 bullets
- 但没有足够的 secondary 信息支撑版式

这意味着当前系统还缺：

- proof
- support text
- tags
- stats
- captions

---

## 产品目标

### 总目标

在不引入 `Art Mode` 的前提下，显著提升 `System Mode` 输出的视觉完成度。

### 具体目标

1. 让页面不再只依赖标题和 bullets 撑视觉
2. 建立一层稳定可复用的组件资产系统
3. 让不同 theme 能消费同一套语义组件
4. 提升 hero / compare / metrics / process / cta 的表现力
5. 在真实主链路里，而不是验证页里，体现这些资产

---

## 非目标

本 PRD 当前不包含：

- `Art Mode` 实现
- 自由生成 HTML
- 任意 case-specific 布局
- 任意设计风格 prompt 输入
- 复杂动画系统
- 大量新 theme

换句话说：

> 这份 PRD只做 `System Mode` 增强，不做模式切换。

---

## 用户场景

当前优先服务的仍然是：

- `pitch`
- `course`
- `report`

尤其优先的是：

- 有明确主张
- 有对比
- 有指标
- 有步骤或阶段

这些场景下，用户最容易感知到视觉资产层的提升。

---

## 需求范围

## P0：必须做

### 1. Tag Chips

作用：

- 承担轻量 meta summary
- 强化 hero supporting information
- 提升页面完成度

适用页型：

- hero
- cta
- summary

### 2. Primary / Secondary CTA

作用：

- 让 CTA 页不再只是文字收尾
- 让产品/营销型内容更像成品

适用页型：

- hero
- cta

### 3. Icon Tile

作用：

- 为卡片、标签、特征项提供更明确的视觉锚点

适用页型：

- hero
- compare
- metrics
- feature card

### 4. Status Mark

作用：

- 支持正负对照
- 支持 before/after
- 支持“痛点 vs 改善”

适用页型：

- compare
- roadmap / decision / report

---

## P1：建议做

### 5. Feature Card

作用：

- 把普通 bullet 升级为可承载 icon、title、support text 的信息卡

适用页型：

- hero supporting area
- capability overview
- use-case overview

### 6. Scenario Card

作用：

- 让类似“适配每个科研场景”这类内容不再只是段落，而变成更明确的使用场景卡

### 7. Mini Data Visuals

作用：

- metrics 页不再只是大数字

包括：

- sparkline
- mini bars
- delta mark

---

## P2：后续考虑

### 8. Image Slot

作用：

- 正式支持产品图、截图、论文图表、结构图等视觉资产

要求：

- 有图时增强
- 无图时优雅退化

### 9. Abstract Diagram Slot

作用：

- 在没有真实图片时，提供可复用抽象图形位

---

## 当前推荐实现顺序

1. `tag chips`
2. `primary / secondary CTA`
3. `icon tile`
4. `status mark`
5. `feature card`
6. `scenario card`
7. `mini data visuals`
8. `image slot`

---

## 输入要求

为了把这层做好，后续你需要提供的输入不再只是“感觉好不好看”，而是：

### 1. 真实 md 文件

至少提供：

- 1 个 pitch
- 1 个粗糙草稿
- 1 个内容比较密的 md

### 2. 组件参考图

优先提供这几类参考：

- tag chips
- CTA button
- icon tile
- status mark

### 3. 每张参考图只回答两句

- 喜欢什么
- 不喜欢什么

---

## 输出要求

后续每次视觉资产相关开发，都应给出：

1. 生成后的 HTML 文件
2. 说明本次新增了哪些组件
3. 说明这些组件进入了哪些页型
4. 告诉用户应该重点看哪些页面

---

## 验收标准

满足以下条件时，认为这轮视觉资产层优化有效：

1. 页面不再只有标题和文字块撑视觉
2. 组件能跨 theme 复用，而不是只在单一 theme 下成立
3. compare / hero / metrics / cta 的完成度明显提升
4. 真实主链路输出明显优于当前基线
5. 不破坏现有 CLI / Studio / semantic contract 稳定性

---

## 当前最重要判断

这份 PRD 的核心判断是：

> 当前阶段最值得做的不是继续发散新模式，而是给 `System Mode` 建立真正的视觉资产层。

也就是说，下一阶段代码应优先服务于：

- 组件系统
- 颜色语义
- 图标系统
- 微型图形
- image slot

而不是继续盲调 theme。
