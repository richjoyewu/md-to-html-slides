# Agent 技术策略方案

## 1. 文档目标

这份文档定义 `md-to-html-slides` 在接下来一段时间内的核心技术方向。

目标不是继续堆功能，而是把系统从“会把 Markdown 变成 HTML”推进到“会理解内容、会规划结构、会在不确定时问用户、会自检纠偏、并稳定产出结果”的 `agentic` 产品。

这份文档回答五个问题：

1. Agent 的智能应该体现在哪里。
2. 为什么需要减少规则，让 LLM 成为主脑。
3. 如何设计主链路与模块边界。
4. 如何测试与评估效果。
5. `P0 / P1` 阶段分别做什么，不做什么。

---

## 2. 核心问题定义

这个项目真正要解决的问题不是：

- Markdown 转 HTML
- 做一个更漂亮的 slides 模板
- 做一个在线编辑器

真正的问题是：

> 用户有内容，但不会把内容稳定地变成结构清楚、可确认、好看、可直接发布的网页演示稿。

更具体地说，用户常见的输入问题是：

1. 输入不是演示结构，而是讲稿、笔记、说明文、课程大纲。
2. 用户不会拆页，不知道一页讲什么。
3. 用户不会把文稿改成演示语言。
4. 用户不会把结果稳定变成高质量网页演示稿。

所以，产品的核心价值不是“渲染”，而是：

> 把原始内容自动转化成适合展示的结构化演示稿。

---

## 3. 核心设计原则

### 3.1 LLM 是主脑，系统是轨道

系统负责：

- 输入清洗
- 状态机
- cache
- timeout
- fallback
- 渲染
- 质量约束

LLM 负责：

- 内容理解
- 规划结构
- 判断是否要问用户
- 改写为演示语言
- 自检与纠偏建议

一句话：

> 系统搭轨道，LLM 开车，不确定就问人。

### 3.2 不让规则替 LLM 做主判断

规则只能承担三种职责：

1. 结构提取
2. 可靠性兜底
3. 渲染和输出约束

规则不应该承担：

1. 提前替 LLM 识别内容意图
2. 把输入过度重写后再交给 LLM
3. 用硬分类决定主路径

这意味着：

- `analysis.ts` 应逐步收缩为结构分析器
- `preprocess.ts` 应逐步收缩为轻预处理器
- `Planner` 才是主语义决策层

### 3.3 不确定就问用户，但只问最少的问题

一个好的 agent 不会：

- 什么都自己猜
- 也不会不停追问

原则是：

1. 能自动做就自动做。
2. 只有关键信息不足时才问。
3. 最多问 1 到 2 个问题。
4. 问完后必须能继续 plan，而不是停住。

### 3.4 产品体验上，用户只面对内容，不面对系统内部复杂性

用户只需要理解：

1. 输入内容
2. 确认每页大纲
3. 预览和导出结果

用户不需要理解：

- Analyzer
- Planner
- Expander
- Polisher
- cache
- fallback
- provider routing

这些都应是系统内部实现。

---

## 4. 理想的 Agent 架构

```text
User Markdown
  -> Structural Analyzer
  -> Plan Mode (LLM)
     -> if uncertain: Clarification
     -> else: Outline
  -> Polisher / Reviewer
  -> Expand Mode (LLM)
  -> Renderer
  -> HTML Preview / Export
```

### 4.1 Structural Analyzer

职责：

- 做结构分析，不做主语义判断。

输出应只包含：

- heading depth
- section count
- bullet density
- sentence length
- roughness
- suggested slide count

不应该承担：

- 硬判断 `course / report / pitch / story`
- 过强的内容理解

### 4.2 Planner

这是主脑。

Planner 应该让 LLM 输出：

```json
{
  "content_intent": "...",
  "audience_guess": "...",
  "planning_confidence": 0.72,
  "uncertainties": ["..."],
  "outline": [
    {
      "title": "...",
      "preview_points": ["..."],
      "detail_points": ["..."]
    }
  ]
}
```

Planner 的核心职责：

1. 识别输入在讲什么。
2. 判断应该拆成几页。
3. 决定一页只保留一个核心点。
4. 输出可确认的大纲。
5. 输出自己的不确定性。

### 4.3 Clarification Gate / Plan Mode

触发条件不应该主要来自规则，而应该来自 Planner 输出：

- `planning_confidence` 低
- `uncertainties` 非空

Clarification 的目标不是“多问”，而是：

- 只问最影响结果的 1 到 2 个问题
- 用户回答后继续 plan

### 4.4 Polisher / Reviewer

Polisher 的职责是：

1. 检查标题是否过长
2. 检查某页是否过满
3. 检查某页是否过薄
4. 检查相邻页是否重复
5. 检查 summary 是否在最后
6. 对明显问题做结构修正

Polisher 应逐步从规则层升级为：

- 规则检查 + LLM 评审混合模式

### 4.5 Expander

Expander 的职责不是“补原文”，而是：

> 把确认后的大纲改写成可以直接上屏的演示内容。

目标：

- 短句化
- 平行化 bullet
- 结论先行
- 去掉讲稿腔
- 保留页结构

### 4.6 Renderer

Renderer 必须保持确定性。

职责：

- 根据结构化 slide content 输出 HTML
- 管模板、样式、布局

不应该交给 LLM 的事情：

- 最终 HTML 自由生成
- CSS 细节
- 模板排版逻辑

---

## 5. 当前代码分层建议

### 5.1 Agent Core

建议作为长期稳定层：

- `agent/analysis.ts`
- `agent/clarification.ts`
- `agent/planner.ts`
- `agent/polisher.ts`
- `agent/expander.ts`
- `agent/fallback.ts`
- `agent/normalize.ts`
- `agent/prompt-builder.ts`
- `agent/moonshot-client.ts`

### 5.2 Backend Orchestrator

- `scripts/studio-server.ts`

职责：

- HTTP API
- timeout
- cache
- streaming
- 调用 agent core

### 5.3 Studio Frontend

- `studio/app.mjs`
- `studio/styles.css`
- `studio/index.html`

职责：

- 输入
- 状态流
- 大纲确认
- 模板预览
- 导出 HTML

---

## 6. 如何让 Agent 更智能

### 6.1 智能不是多模型，不是多 agent，而是更好的决策

当前阶段，智能主要来自：

1. 是否会判断下一步做什么。
2. 是否会在不确定时问人。
3. 是否会把大任务拆成小任务。
4. 是否会发现自己结果有问题。
5. 是否能根据输入质量切换策略。

### 6.2 当前最值得强化的三层

#### A. Planner

最重要。

因为：

- outline 决定后面所有结果上限
- outline 错了，render 再好也没用

要继续优化：

- 更好理解粗糙输入
- 更合理拆页
- 生成更像 slide 的标题
- 更准确判断哪些信息该上屏

#### B. Clarification

目标：

- 更少问
- 问更准
- 问完真的改善 planning

需要避免：

- 内容一短就问
- 规则先把问题决定好

#### C. Polisher

目标：

- 对 outline 做自检
- 自动修正明显问题
- 让 agent 不只是生成，还会“检查自己”

---

## 7. 如何减少规则

### 7.1 哪些规则应该保留

这些规则是必要的：

1. `normalize`
- 清洗不稳定输出

2. `fallback`
- LLM 超时或失败时保证可用性

3. `cache`
- 降低重复计算

4. `state machine`
- 保证产品流程稳定

5. `renderer constraints`
- 让 HTML 输出确定性

### 7.2 哪些规则应该减少

要继续收的地方：

1. `analysis.ts`
- 减少语义分类规则

2. `preprocess.ts`
- 减少重度 regroup / rewrite 规则

3. `clarification.ts`
- 减少“系统替 LLM 决定问什么”的规则

4. `prompt-builder.ts`
- 减少过多教条式提示，给 LLM 正常理解空间

### 7.3 目标状态

不是“没有规则”，而是：

> 规则只负责结构、可靠性和兜底；主语义判断交给 LLM。

---

## 8. 测试策略

这个项目不能只靠“手动输一段 Markdown 看结果”。

需要建立四层测试体系。

### 8.1 单元测试

测试最小模块：

- analyzer
- clarification
- normalize
- polisher
- fallback

目标：

- 逻辑别坏
- 明确边界

### 8.2 场景回归测试

建立固定 fixtures 样本库：

- `course`
- `report`
- `pitch`
- `story`

每类至少分：

- `clean`
- `rough`
- `extreme`

### 8.3 自动质量评分

当前主要评分维度：

- `clarification_score`
- `segmentation_score`
- `title_length_score`
- `density_score`
- `duplication_score`
- `rawness_rewrite_score`
- `expansion_score`

后续可以增加：

- `outline_acceptability_score`
- `slide_clarity_score`
- `summary_position_score`
- `manual_edit_cost_estimate`

### 8.4 自动发现退化

测试系统应该自动发现：

- 页数不足
- 标题过长
- 相邻页重复
- 仍然保留大量原文草稿句式
- clarification 误触发
- rough 输入未被重写

---

## 9. 如何评估 Agent 和产品是否变好

### 9.1 Agent 评估指标

1. `outline_accept_rate`
- 用户是否接受大纲，不返回重改

2. `clarification_quality`
- 问题是否少而准

3. `rewrite_quality`
- 输出是否像 slide，而不是原文

4. `self_correction_rate`
- Polisher 是否减少明显结构问题

5. `fallback_hit_rate`
- fallback 是否过于频繁

### 9.2 产品评估指标

1. 结构是否清楚
2. 一页是否只讲一个点
3. 标题是否像 slide 标题
4. 内容是否适合上屏
5. 是否需要大量手改
6. 最终 HTML 是否愿意直接分享

一句话判断标准：

> 用户第一次生成后，改动越少，产品越好。

---

## 10. P0 需求

### 10.1 P0 Summary

P0 只做一件事：

> 把主链路做成稳定可用的 `Markdown -> 大纲确认 -> HTML 预览/导出`。

### 10.2 P0 功能范围

1. `Plan` 稳定可用
- 输入 Markdown 后能稳定生成每页大纲
- 支持 clarification / fallback / cache
- 不长时间卡死
- 大纲结果至少包含：
  - 页标题
  - 3 条核心内容
  - 可展开的完整要点

2. `Clarification / Plan Mode` 闭环
- 信息不足时只问 1 到 2 个关键问题
- 用户回答后能继续 planning

3. `Planner` 质量达标
- 对粗糙输入使用更强重写策略
- 一页一个核心点
- 标题像 slide 标题
- 页数基本合理

4. `Polisher` 基本可用
- 压标题
- 去重
- 拆过满页
- 合并过薄页
- 降低相邻页重复
- summary 页后置

5. `Expand` 稳定可用
- 用户确认大纲后能补成可渲染页面内容
- 支持 cache / fallback

6. `状态流闭环`
- `idle`
- `planning`
- `clarification`
- `outline_ready`
- `expanding`
- `preview_ready`
- `failed`

7. `测试回归基础可用`
- fixtures 覆盖主要内容类型和输入质量层级
- `check:agent` 能发现明显退化

### 10.3 P0 不做什么

- 不做图片、图标、复杂 block system
- 不做 PPT 导出
- 不做 24h 自动改代码闭环
- 不做长期记忆驱动的对话产品

---

## 11. P1 需求

P1 的目标不是加很多新功能，而是：

> 让 agent 更像真正的主脑，而不是规则驱动的工具链。

### 11.1 P1 重点

1. `Planner` 真正主脑化
- 让 LLM 输出：
  - `content_intent`
  - `audience_guess`
  - `planning_confidence`
  - `uncertainties`
  - `outline`
- 弱化规则分类对主路径的影响

2. `Clarification` 智能化
- 更依赖 `LLM uncertainty`
- 更少问、更准问

3. `Expander` 改写能力强化
- 去原文痕迹
- bullet 平行化
- 结论先行
- 更像演示文稿编辑器

4. `Polisher` 强化
- 做更像 reviewer 的结构检查
- 检查顺序、逻辑、密度、重复

5. `评测体系增强`
- 更严的评分器
- 更好的 bug 分类
- 更清楚的 regression report

### 11.2 P1 仍然不建议优先做

- 多 agent 炫技拆分
- 复杂聊天界面
- 大而全的 memory 系统
- PPT 引擎

---

## 12. 关于 Memory

当前阶段不需要重型 memory。

### 12.1 cache 和 memory 的区别

`cache`：
- 为了快
- 相同输入复用结果
- 不理解用户

`memory`：
- 为了连续性和个性化
- 记住用户偏好和长期背景
- 不要求输入完全一样

### 12.2 当前阶段建议

先保留：
- `cache`

后续再加轻量 `memory`：
- 默认页数偏好
- 模板偏好
- 受众偏好
- 标题长短偏好

不建议现在就做：
- 大型对话记忆系统

---

## 13. 关于多 Agent

当前阶段不需要多 agent。

原因：

- 单 agent 还没做强
- 多 agent 会显著增加复杂度
- 当前主要问题不是协同，而是主脑质量

中期如果要扩展，优先考虑：

- `主 agent + reviewer agent`

而不是一开始拆很多执行 agent。

---

## 14. 关于“引擎”

当前阶段不需要做 PPT 引擎。

当前更适合做的是：

- 强 agent
- 轻 renderer
- 可扩展 block system（后续）

什么时候才需要引擎：

- 拖拽编辑
- 母版系统
- 动画时间轴
- PPT/PDF 高保真导出

这不是 P0 / P1 的重点。

---

## 15. 当前最重要的技术判断

一句话总结：

> 这个项目不是在做一个把 Markdown 渲染成 HTML 的工具，而是在做一个用 LLM 把原始内容转化为演示结构、并稳定产出网页演示稿的 agentic 系统。

所以技术优先级必须是：

1. 让 `Planner` 更像主脑
2. 让 `Clarification` 更像 plan mode
3. 让 `Polisher` 更像 reviewer
4. 让 `Expander` 更像演示内容改写器
5. 让系统通过 `cache / fallback / state flow / tests` 保持可靠

而不是优先追求：

- 更多模板
- 更多 UI 组件
- 多 agent 噱头
- PPT 导出
- 复杂引擎

