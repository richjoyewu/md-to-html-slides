# 下一阶段技术策略与优先级

## 1. 当前判断

当前系统已经完成了 `P0` 主链路：

- `Markdown -> Plan -> Clarification -> Outline Confirmation -> Expand -> RenderDeck -> HTML`
- 具备：
  - `cache`
  - `fallback`
  - `state flow`
  - `polisher`
  - 回归测试

当前系统已经不再是普通的 `md -> html` 工具，而是一个具备 agentic 编排能力的内容系统。

当前阶段判断：

1. `P0` 已完成。
2. `P1` 已进入实现阶段。
3. 当前回归结果已达到：
- `average_overall: 0.996`
- `bug_counts: {}`

这意味着：
- 主链路稳定
- clarification 闭环成立
- Planner / Expander / Polisher 当前版本均通过现有 fixtures 回归

下一阶段的重点不再是“修剩余 blocker”，而是继续提升：

1. `Planner` 的主线理解和取舍能力。
2. `Expander` 的演示稿改写质量。
3. `Polisher` 的结构评审深度。

因此，下一阶段的技术重点不是增加新功能，而是继续把系统从“稳定可用的 agentic MVP”推进到“更强主脑驱动的可靠 agent”。

---

## 2. 总体技术原则

### 2.1 系统负责什么
系统只负责：

- 输入清洗
- 结构提取
- 状态机
- cache
- timeout
- fallback
- normalize
- renderer

### 2.2 LLM 负责什么
LLM 负责：

- 内容意图理解
- 是否需要追问
- 拆页
- 标题生成
- 每页内容组织
- 草稿重写
- 演示语言改写

### 2.3 不确定就问人
如果 LLM 对以下内容不确定：

- 内容意图
- 目标受众
- 页数规模
- 重点侧重

则系统应让 LLM 生成 1 到 2 个关键问题，并在用户回答后继续 planning，而不是硬猜。

### 2.4 规则只用于兜底，不用于主脑决策
规则可以存在于：

- fallback
- normalize
- cache
- state machine
- renderer
- polish 的结构约束

规则不应该继续承担：

- 主路径内容意图判断
- 主路径内容分类
- 主路径文案改写

---

## 3. 当前理想架构

```text
User Markdown
  -> Structural Analyzer
  -> Plan Mode (LLM)
     -> if uncertain: Clarification
     -> else: Outline
  -> Polisher / Reviewer
  -> Expand Mode (LLM)
  -> RenderDeck
  -> Renderer
  -> HTML Preview / Export
```

模块分层：

1. `Structural Analyzer`
- 只做结构分析，不做语义分类
- 输出：
  - heading depth
  - section count
  - bullet density
  - sentence length
  - roughness

2. `Planner`
- LLM 主脑
- 输出：
  - `content_intent`
  - `audience_guess`
  - `planning_confidence`
  - `uncertainties`
  - `outline`

3. `Clarification Gate`
- 如果 `planning_confidence` 低
- 或 `uncertainties` 非空
- 就问用户最少的问题

4. `Polisher / Reviewer`
- 检查 outline 质量
- 修：
  - 过满页
  - 过薄页
  - 重复页
  - 标题过长
  - summary 位置错误

5. `Expander`
- 把 outline 变成上屏内容
- 不复述原文
- 生成：
  - `preview_points`
  - `detail_points`
  - expanded slide content

6. `RenderDeck`
- 把 expanded 结果冻结为 renderer 最终消费的确定性结构
- 输出：
  - `title`
  - `intro`
  - `meta`
  - `slides[*].id / variant / blocks`

7. `Renderer`
- deterministic
- 只负责 HTML，不负责内容判断

---

## 4. 当前阶段重点

下一阶段只优先做三类事情：

1. `Planner`
- 提升主线理解
- 提升拆页取舍
- 提升标题与展示单元聚焦
2. `Expander`
- 提升演示语言质量
- 减少草稿腔和原文复述
3. `Polisher / Reviewer`
- 提升结构审稿深度
- 更稳定地发现过满页、过薄页、重复页

系统层优先做：

- shared contract 收口
- provider 抽象稳定
- CLI / Studio / server 共享同一套 normalize 和 helper
- `RenderDeck` contract 固定化并持续校验
- regression 与 eval 持续可跑

不优先做：

- 大量新主题
- 新展示模式落地
- 复杂工作台功能
- 高度开放的多 agent 框架

---

## 5. 中间态展示原则：以终为始

中间态的目的不是给用户看系统内部过程，而是帮助用户确认：

`这一页最终要表达什么。`

因此，中间态设计必须服从最终目标：
- 让用户快速判断每页是否合理
- 让用户在不看最终 HTML 的前提下，确认页面结构和内容方向
- 避免暴露不必要的技术中间字段

### 4.1 中间态不应该展示什么
不应该默认展示：

- `summary`
- `intent`
- `planning_confidence`
- `uncertainties`
- 其他内部元数据

这些字段对系统有价值，但对用户确认“这一页讲什么”帮助有限。

### 4.2 中间态应该展示什么
应该默认展示：

1. 页标题
2. 2 到 3 条核心内容
3. 点击后可展开完整页内容

也就是说：
- 默认态让用户快速扫全局
- 展开态让用户确认这一页到底讲什么

### 4.3 当前最合理的展示形态
当前阶段最合理的形态是：

`Accordion 式页面卡片`

每页卡片默认展示：
- 页码
- 标题
- 2 到 3 条核心要点

展开后展示：
- 完整要点列表
- 完整本页内容

不建议当前阶段使用：
- 思维导图
- 提前展示 HTML
- 复杂的双向编辑器视图

原因：
- 当前产物是线性 slide deck
- 用户当前的核心任务是确认“每页内容”，不是探索知识网络

---

## 6. 前端、后端、Agent 的优化点

### 5.1 前端优化点
目标：
`更像一个低门槛内容工作台，不像工程调试台。`

当前优先级：低于 Agent 和 Backend，只做支持主链路的必要优化。

关键优化点：
1. 输入页继续保持单任务界面
- 输入内容
- 生成大纲
- clarification（必要时）

2. 大纲确认更像内容审稿
- 默认看标题 + 核心要点
- 展开看完整内容
- 不暴露系统内部字段

3. 第二步结果页更纯粹
- 模板选择
- 大预览
- 导出
- 不混结构确认信息

4. 等待状态更自然
- 让用户感觉系统在工作
- 不要暴露太多系统内部状态术语

### 5.2 后端优化点
目标：
`更稳定、更像服务，而不是实验脚本。`

当前优先级：
- `P0` 阶段：`Backend + 主链路 Agent 可用性 > Frontend`
- `P1` 阶段：`Agent > Backend > Frontend`

关键优化点：
1. `plan / expand` 契约持续收紧
- 输入输出 schema 稳定
- 前后端命名一致
- 避免隐式结构转换

2. observability
- plan latency
- expand latency
- clarification 命中率
- fallback 命中率
- cache 命中率

3. 错误包装
- 不空白失败
- 明确反馈：慢、超时、fallback、可重试

4. 减轻模型负担
- `plan` 只做 outline
- `expand` 再补内容
- 不一次要求模型做完整 deck

### 5.3 Agent 优化点
目标：
`让 agent 更像主脑，而不是模板加工器。`

当前优先级：最高。

关键优化点：
1. `Planner`
- 更强主线理解
- 更会取舍
- 更会估计合理页数
- 更会判断哪些内容该上屏、哪些留给讲稿

2. `Clarification`
- 更少问
- 更准问
- 只问真正影响 planning 的问题

3. `Expander`
- 更像演示稿编辑器
- 把文稿语言改成上屏语言
- bullet 更短、更平行、更结论先行

4. `Polisher`
- 更像评审器
- 发现：
  - 页过满
  - 页过薄
  - 相邻页重复
  - 顺序不合理
  - 标题过长

---

## 6. P0 / P1 优先级与退出条件

### 6.1 分阶段优先级

#### P0
`Backend + 主链路 Agent 可用性 > Frontend`

原因：
- P0 的目标是让主链路稳定完成
- 不是让结果达到最高智能度

#### P1
`Agent > Backend > Frontend`

原因：
- P1 的重点是提升：
  - 理解能力
  - 改写能力
  - 纠偏能力
- 当前最大的价值瓶颈在 Agent，而不在 UI 细节

### 6.2 P0 完成定义（已完成）
满足以下条件，即视为 `P0` 完成：

1. 用户输入一份普通 Markdown，最多经过一次补充信息，就能得到可确认的大纲。
2. `Plan Mode` 稳定：
- 输出 `planning_confidence + uncertainties`
- clarification 能闭环
- 不会停在“提问但无法继续”
3. `Outline` 可确认：
- 每页能看到标题 + 核心内容预览
- 可展开查看完整内容
4. `Expand` 稳定：
- 确认大纲后能进入 HTML 预览
- 支持 `cache / fallback`
5. 主路径不再由规则主导语义决策：
- 结构由系统处理
- 内容理解由 LLM 决定
- 不确定时问人
6. 回归测试能发现明显退化：
- fixtures 覆盖核心输入场景
- `check:agent` 能跑全量样本

当前状态：以上条件已满足。

### 6.3 P1 当前目标
P1 的重点不是增加更多功能，而是提升 Agent 的智能度。

#### P1-1 Planner
- 更强主线理解
- 更会取舍
- 更准估计页数

#### P1-2 Expander
- 更像演示稿编辑器
- 更少原文腔
- 输出更像可直接上屏的内容

#### P1-3 Polisher
- 更强结构评审能力
- 不是只修补，而是更像 reviewer

#### P1-4 Clarification
- 更自然
- 更少打断
- 更像 plan mode，而不是表单兜底

### 6.4 当前 agent 现状
当前 agent 已具备以下能力：

- `Planner`：能输出 `content_intent / audience_guess / planning_confidence / uncertainties / outline`
- `Clarification`：已从规则主导过渡到 `LLM uncertainty` 优先
- `Expander`：已从“补内容”推进到“改写为上屏内容”
- `Polisher`：已具备拆页、合并、去重、顺序纠偏等基础评审能力
- `Fallback`：只承担结构兜底，不再承担主路径内容改写职责

当前系统已不是普通的 `md -> html` 工具，而是一个：

`LLM 负责理解和决策，系统负责结构、可靠性和兜底的 agentic 演示稿系统。`

### 6.5 接下来代码任务
按照当前优先级，后续代码任务顺序固定为：

1. `Expander` 继续做深
- 输出更像演示稿编辑器
- bullet 更短、更平行、更结论先行
- 减少原文腔和说明文腔
- 增加 rewrite 质量元信息，支撑后续评测

2. `Planner` 继续做深
- 更强主线理解
- 更会取舍
- 更稳判断哪些内容该上屏、哪些留给讲稿
- 提高 `deck_goal / core_message / omitted_topics / uncertainty_quality`

3. `Polisher` 继续做深
- 从修补器升级成 reviewer
- 强化结构评审输出
- 对顺序、重复、过满、过薄做更细粒度修正

4. `测试与评估` 继续升级
- 不只看 bug 是否清零
- 开始引入更高阶的 Planner / Expander / Polisher 质量指标

### 6.4 P1 当前完成状态
当前 P1 状态：

- `Planner`：已推进第一轮
- `Expander`：已推进第一轮
- `Polisher`：已推进第一轮，并通过当前 fixtures 回归
- `Clarification`：已完成从“规则主导”到“LLM uncertainty 优先”的过渡

当前回归状态：
- `average_overall: 0.996`
- `bug_counts: {}`

这说明：
- 当前 P1 第一轮实现已经通过现有测试集
- 下一步不再是“修剩余 blocker”，而是提高更高层的质量标准

---

## 7. 测试与评估策略

### 7.1 测试目标
测试系统要回答 4 个问题：

1. agent 有没有理解内容
2. agent 有没有正确拆页
3. agent 有没有把粗稿改成演示稿
4. agent 是否在退化

### 7.2 当前保留的评估维度
- `clarification_score`
- `segmentation_score`
- `title_length_score`
- `density_score`
- `duplication_score`
- `rawness_rewrite_score`
- `expansion_score`

### 7.3 下一步应新增的评估维度
- `planner_confidence_quality`
- `uncertainty_quality`
- `clarification_value_score`
- `expanded_slide_like_score`
- `polisher_fix_rate`

### 7.4 当前测试状态
- fixtures 已覆盖：
  - `course / report / pitch / story`
  - `clean / rough / extreme`
- `check:agent` 已可批量回归
- 当前基线结果：
  - `average_overall: 0.996`
  - `bug_counts: {}`

因此，下一步测试重点不再是“修残余 bug”，而是：
- 提高评测质量
- 引入更高阶的质量指标
- 防止智能度提升时出现隐性退化

---

## 8. 代码层面的下一步拆分

### 当前主要模块
- `analysis.ts`
- `clarification.ts`
- `planner.ts`
- `expander.ts`
- `fallback.ts`
- `normalize.ts`
- `polisher.ts`
- `prompt-builder.ts`
- `moonshot-client.ts`

### 下一步建议
1. 把 `prompt-builder.ts` 继续拆成：
- `plan-prompt.ts`
- `expand-prompt.ts`

2. 给 `polisher.ts` 增加更明确的 review 输出
例如：
- `issues`
- `actions_taken`

3. 后续增加：
- `reviewer.ts`
作为独立的评审层

---

## 9. 当前状态：已完成 / 进行中 / 下一步

### 9.1 已完成
- `P0` 主链路完成
- `Plan Mode` 已支持 `confidence + uncertainties`
- clarification 闭环可用
- Outline 可展开确认
- Expand / Preview / Export 主链路完成
- `cache / fallback / state flow` 已建立
- fixtures + `check:agent` 已建立
- `Polisher` 第一轮结构评审能力已完成
- 当前 fixtures 回归全绿

### 9.2 进行中
- `P1`：Agent 智能度提升
- 重点：
  - Planner
  - Expander
  - Polisher
  - Clarification

### 9.3 下一步
1. 提升 `Planner` 的主线理解和取舍能力
2. 提升 `Expander` 的上屏改写质量
3. 强化 `Polisher` 的 review 输出与结构判断
4. 提升测试维度，不再只看 bug 清零

### 9.4 当前 blocker / 非 blocker

#### blocker
- 当前无 blocker

#### 非 blocker
- 图片 / 图标 / block system
- PPT 导出
- 多 agent
- 重型 memory
- 自动改代码闭环

这些都不是当前阶段最重要的问题。

---

## 10. 当前不做什么

当前阶段不做：

- 图片主链路
- 图标系统
- 复杂 block system
- PPT 导出
- 多 agent 编排
- 长期 chat memory
- 24h 自动改代码闭环

原因：
这些都不是当前主链路的瓶颈。

---

## 11. 一句话总结

下一阶段的技术策略是：

**P0 已完成；P1 的重点是继续减少主路径中的规则依赖，让“理解、追问、规划、改写、评审”的主脑权更多交给 LLM；系统只负责结构、可靠性与兜底。**

## 12. P1 核心模块如何继续做深

当前回归结果：
- `npm run build:ts` 通过
- `npm run check:agent` 通过
- `average_overall = 1`
- `bug_counts = {}`

这说明当前主链路已经稳定，但这不代表 `Planner / Expander / Polisher` 已经到达智能上限。下一阶段要做的是“质量深化”，不是继续堆功能。

### 12.1 Planner 如何继续做深

目标：让 Planner 更像主脑，而不是 outline 生成器。

继续优化方向：
1. 更强主线理解
- 不只拆页，而是先确定：
  - 这份内容真正想传达什么
  - 哪些内容是主线
  - 哪些内容可以省略或后置
- 已经引入的字段：
  - `deck_goal`
  - `core_message`
  - `omitted_topics`
- 下一步要让这些字段真正参与后续质量判断，而不是只作为元信息返回。

2. 更会取舍
- Planner 要逐步从“把内容分成多页”升级为“只保留值得上屏的内容”。
- 重点看：
  - 是否仍然把太多说明文放进 outline
  - 是否会保留不重要细节
  - 是否会让 summary / cta / example 页出现在不合理位置

3. 更稳的 planning confidence
- `planning_confidence` 不能只是装饰字段。
- 后续要用于：
  - clarification 触发
  - fallback 策略选择
  - 回归评估

4. 更真实的 uncertainties
- `uncertainties` 应该体现 Planner 真正不确定的点：
  - 受众不清楚
  - 页数目标不清楚
  - 重点不清楚
- 不应该变成固定模板化输出。

### 12.2 Expander 如何继续做深

目标：让 Expander 更像演示稿编辑器，而不是把 outline 补长。

继续优化方向：
1. 减少原文腔
- bullet 应该像上屏内容，而不是整理后的讲稿。
- 重点是：
  - 更短
  - 更平行
  - 更结论先行
  - 更少“说明文解释腔”

2. 让内容块更稳定
- 当前主输出仍然是：
  - `title`
  - `format`
  - `bullets`
  - `body`
- 下一步要让不同 `format` 下的输出更稳定，减少：
  - title-body 里 body 过长
  - title-bullets 里 bullet 长短差异过大

3. 更强 rough input rewrite
- 对粗糙输入，Expander 不该复述原文。
- 而应该在已确认 outline 基础上：
  - 压缩
  - 重写
  - 重新组织语言

4. 与 Planner 解耦但协同
- Planner 决定“讲什么”
- Expander 决定“怎么上屏”
- 后续要避免 Expander 再次篡改主线，而是专注于表达质量。

### 12.3 Polisher 如何继续做深

目标：让 Polisher 从修补器变成评审器。

继续优化方向：
1. 更强结构评审
- 继续检查：
  - 页过满
  - 页过薄
  - 相邻页重复
  - 顺序不合理
  - summary / cta 位置错误

2. Review 输出可观测
- 后续 Polisher 不只返回修正后的结果，还应补充：
  - `issues`
  - `actions_taken`
- 用于后续评估和调试。

3. 不做语义主脑，只做质量约束
- Polisher 可以做结构判断和轻量修正。
- 不应替 Planner 再次做主线重构。

4. 逐步引入 reviewer 视角
- 后续可以考虑让 Polisher 增加“这份结果像不像演示稿”的轻量自评逻辑。
- 但仍保持 deterministic 约束为主。

## 13. P1 是否需要评估和测试

需要，而且必须比 P0 更严格。

P0 重点是“主链路稳定”，P1 重点是“结果质量真的变好”。

### 13.1 P1 评估重点

1. Planner 评估
- 是否真正理解主线
- 是否能控制页数
- 是否会省略不该上屏的内容
- `planning_confidence` 是否与实际质量一致

2. Expander 评估
- 是否仍有原文腔
- bullet 是否短而平行
- body 是否像上屏说明，而不是长段文稿

3. Polisher 评估
- 是否减少重复页
- 是否减少过满页/过薄页
- 是否修正结构顺序

### 13.2 P1 回归测试要补什么

在现有 `check:agent` 基础上，后续应补：
1. `planner_focus_score`
- 衡量 outline 是否围绕 `core_message`

2. `uncertainty_quality_score`
- 衡量 `uncertainties` 是否真实、有价值，而不是空洞模板

3. `slide_likeness_score`
- 衡量 expanded 内容是否像演示稿而不是文稿

4. `polisher_effect_score`
- 衡量 Polish 前后：
  - 重复度是否下降
  - 过满页是否减少
  - 顺序是否更合理

### 13.3 当前原则

- P0：用回归保证“主链路可用”
- P1：用回归和评分共同保证“结果质量提升”

一句话：
**P1 必须测试，而且不只是测有没有 bug，还要测 agent 是否真的更聪明。**


## 接下来代码任务

1. `P1 / Expander`
- 更像演示稿编辑器
- 更少原文腔
- bullet 更短、更平行、更结论先行

2. `P1 / Polisher`
- 更强结构评审
- 更像 reviewer，而不是修补器

3. `P1 / Planner` 后续继续深化
- 更强主线理解
- 更会取舍
- 更稳判断哪些内容该上屏、哪些留给讲稿



## Planner / Expander / Polisher：LLM 能力、代码职责、测试方法

### 1. Planner

#### LLM 能力
- 理解内容主线
- 判断页数规模
- 决定每页讲什么
- 输出 `planning_confidence + uncertainties`
- 提炼：
  - `deck_goal`
  - `core_message`
  - `omitted_topics`

#### 代码职责
- 收紧 `plan` 输入契约
- 保持结构分析与语义理解分层
- 简化 `plan prompt`，只保留必要约束
- 让前端、后端和测试统一消费同一套 outline schema
- clarification 主要基于 planner 输出触发，而不是前置规则

#### 测试方法
- 大纲接受率
- 页数是否合理
- 标题是否像 slide 标题
- `deck_goal / core_message / omitted_topics` 是否稳定
- `planning_confidence / uncertainties` 是否与输入难度匹配

### 2. Expander

#### LLM 能力
- 把 confirmed outline 改写成真正可上屏的内容
- 减少原文腔、草稿腔
- bullet 更短、更平行、更结论先行
- 区分：
  - `course`
  - `report`
  - `pitch`
  - `story`
  的表达方式

#### 代码职责
- 组织好 `markdown + outline + clarification answers + analysis` 输入上下文
- 重写 expand prompt，让目标从“补内容”变成“演示稿改写”
- `normalizeExpanded()` 只负责稳定性约束：
  - bullet 数量
  - 长度
  - 空值
  - format 纠偏
- fallback 只负责兜底，不承担高质量改写

#### 测试方法
- `raw_sentence_leak`
- bullet 长度是否过长
- bullet 是否平行
- expanded 内容是否仍然像讲稿或草稿
- 用户后续手改量是否下降

### 3. Polisher

#### LLM 能力
- 判断哪些页过满、过薄、重复、顺序不合理
- 判断某页标题是否过泛或不像 slide 标题
- 对结构问题给出修正建议

#### 代码职责
- 把 `Polisher` 从修补器提升为 reviewer
- 输出：
  - `issues`
  - `actions_taken`
- 支持：
  - 拆页
  - 合并
  - 重排顺序
  - 标题修正
- 保持结构修正可解释，而不是黑箱处理

#### 测试方法
- 相邻页重复比例
- 过满页比例
- 过薄页比例
- `summary / cta` 位置是否合理
- 修正前后结构质量是否提升

### 当前优先级
1. `Planner`
2. `Expander`
3. `Polisher`

### 模型替换优先级
- 如果后续测试不同 LLM 的效果，优先替换：
  1. `Planner`
  2. `Expander`
- `Polisher` 可以先保持规则 + 轻评审，再逐步 LLM 化
