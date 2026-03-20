# System Mode vs Art Mode 边界定义

## 文档目的

这份文档用于回答两个实际问题：

1. `md-to-html-slides` 当前默认应该是哪一种模式
2. 如果未来引入 `Art Mode`，它和当前 `System Mode` 的边界应该如何划分

它不是实现文档。
它是产品与工程边界文档。

---

## 模式定义

### 1. System Mode

`System Mode` 指的是当前项目正在建设的默认模式。

核心目标：

- 把原始内容稳定转成展示结构
- 让结果可以确认、可预测、可维护
- 保持主链路一致

核心链路：

`Markdown -> Plan -> Clarification -> Outline Confirmation -> Expand -> Semantic Blocks -> Theme Renderer -> HTML`

关键词：

- 稳定
- 可测试
- 可复用
- 可维护
- deterministic

### 2. Art Mode

`Art Mode` 指的是未来可能新增的一种高自由模式。

核心目标：

- 为当前输入直接生成更强定制感、更接近设计稿的一次性 HTML 成品

可能链路：

`Markdown -> Creative Layout Draft / HTML Art Generation -> HTML`

关键词：

- 高自由
- 高定制
- 高波动
- 更惊艳
- case-specific

---

## 两种模式分别解决什么问题

### System Mode 解决的问题

- 用户有内容，但不会拆页
- 用户不会把文稿语言变成演示语言
- 用户需要确认结构是否合理
- 用户希望输出稳定、可靠、可迭代

### Art Mode 解决的问题

- 用户不想反复调 theme
- 用户希望一次拿到更像设计稿的 HTML
- 用户更重视“当前这个案例足够惊艳”
- 用户愿意接受更高波动，换取更强视觉完成度

---

## 默认模式决策

当前默认模式必须是：

> `System Mode`

原因：

1. 当前项目的核心价值仍然是“内容转展示结构”
2. 当前系统已经围绕 `Plan -> Clarification -> Expand -> Render` 建立主干
3. 当前已有 cache、fallback、state flow、regression
4. 当前产品还没有准备好同时维护两种质量标准

所以当前阶段不应把 `Art Mode` 设为默认。

---

## 边界划分

### 一、输入边界

#### System Mode 输入

- Markdown
- skill
- 可选 clarification answers

不要求：

- 视觉参考图
- 风格提示词长段描述
- 高度定制化设计说明

#### Art Mode 输入

除了 Markdown 之外，应允许或鼓励补充：

- 审美参考图
- 目标风格关键词
- 想模仿的页面气质
- 对图标、配色、密度、版式的偏好

也就是说：

> `Art Mode` 比 `System Mode` 更依赖额外设计输入。

### 二、输出边界

#### System Mode 输出

输出应该始终经过：

- planning
- semantic blocks
- deterministic theme renderer

输出结果重点是：

- 结构清楚
- 页面稳定
- 可持续迭代

#### Art Mode 输出

输出可以更接近：

- 完整自由 HTML
- case-specific CSS
- inline SVG / 图标 / 装饰图形
- 非标准布局

重点是：

- 成品感
- 视觉完成度
- 当前案例贴合度

### 三、工程边界

#### System Mode

系统负责：

- schema
- state flow
- cache
- fallback
- semantic contract
- deterministic rendering

#### Art Mode

系统不应强求：

- 和 System Mode 共用同一 renderer contract
- 和 System Mode 使用同一套回归标准
- 和 System Mode 完全一致的输出稳定性

### 四、质量标准边界

#### System Mode 关注

- planning 是否合理
- clarification 是否必要
- 改写是否上屏
- semantic blocks 是否正确
- renderer 是否稳定

#### Art Mode 关注

- 页面是否有设计稿完成度
- 视觉层级是否强
- 是否比通用 mode 更惊艳
- 当前案例是否被有效放大

---

## 不能做的事情

以下做法必须避免：

1. 不要把 `Art Mode` 偷渡进当前 renderer
2. 不要让 `Art Mode` 反向破坏 `System Mode` 的 deterministic contract
3. 不要用 `Art Mode` 结果去直接否定 `System Mode` 的存在价值
4. 不要要求一套 prompt 同时兼顾“稳定系统输出”和“自由创意成品”
5. 不要用同一套 eval 去强行比较两种模式

---

## 当前代码任务是否应该继续

当前阶段代码任务不应该是：

- 继续无止境微调 theme
- 继续用通用 renderer 硬追 Claude 风格
- 直接实现 `Art Mode`

当前阶段代码任务应该是：

1. 收敛 `System Mode` 主链路
2. 统一主链路输出心智
3. 明确 semantic visual block 的长期方向
4. 补足质量判断标准

---

## 当前推荐的任务优先级

### P0

- 稳住 `System Mode` 的产品和工程边界
- 不再盲目追加 theme 微调

### P1

- 统一当前主链路
- 让真实输出和语义 contract 演示输出逐步收敛

### P2

- 建立视觉质量 rubric
- 明确 compare / hero / metrics / process 的验收标准

### P3

- 在文档层完成 `Art Mode` 设计
- 但暂不实现

### P4

- 当且仅当上面三项都清楚后，再决定是否真正开发 `Art Mode`

---

## 当前你需要提供的输入

如果继续推进 `System Mode`，你最需要提供的是：

1. 三页参考样本
- 1 个 hero
- 1 个 compare
- 1 个 metrics

2. 每页只回答两件事
- 喜欢什么
- 不喜欢什么

3. 明确红线

例如：

- 不能有无意义大留白
- 不能无端换行
- 不能三张卡像复制品
- 图标不能只是重复装饰

如果未来要评估 `Art Mode`，你还需要额外提供：

- 审美关键词
- 想接近的产品或作品
- 视觉参考图

---

## 当前最终判断

### 当前产品判断

当前产品默认继续做：

> `System Mode`

### 当前工程判断

当前不应立即开发：

> `Art Mode`

### 当前管理判断

当前最重要的不是继续写样式，而是：

> 统一路线判断，减少模式混淆，明确下一阶段代码只服务于 `System Mode` 收敛。
