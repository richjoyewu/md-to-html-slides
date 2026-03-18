# md-to-html-slides

**语言:** [English](./README.md) | 简体中文

把文字语言变成适合演讲的视觉语言，帮助演讲者更清晰、更有说服力地表达。

## 🎯 产品使命

**md-to-html-slides** 是一个面向演讲表达的智能展示系统。

只需写一份 Markdown 笔记，系统会自动：
- 🧠 理解内容结构
- 📋 规划展示结构
- ✨ 生成专业级 HTML 展示页面
- 📱 响应式设计，支持各种设备

## 它是什么

这不是一个单纯的 Markdown 转 HTML 工具，也不只是一个 PPT 替代品。

它更准确地说是一个 agent 驱动的展示系统，会：

- 理解内容结构
- 把文字语言转成适合表达的展示结构
- 以网页原生的 HTML 形式完成最终呈现

当前公开边界：

- 当前仍以 `deck` 模式为主
- 当前主输出仍是单文件 HTML
- 后续会扩展到 `roadmap`、`briefing`、`storyflow` 等展示模式

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 运行工作室演示
```bash
npm run studio
```

然后打开浏览器访问：`http://127.0.0.1:4173/`

你会看到：
- 左侧 Markdown 编辑器
- deck profile 选择器
- 右侧实时预览
- 主题实时切换
- 一键导出 HTML

### 3. 命令行生成展示页面
```bash
# 使用 dark-card 主题
npm run build:example

# 使用 editorial-light 主题
npm run build:example:editorial

# 使用 tech-launch 主题生成 pitch 示例
npm run build:example:launch

# 预览演示文稿
npm run preview:example

# 验证 Markdown 结构
npm run validate:example

# 跑 live LLM 回归
npm run check:llm

# 对比 baseline / candidate provider
npm run check:llm:ab
```

### 4. 用自己的内容
```bash
node ./scripts/build.mjs build ./your-file.md -o ./output.html --theme dark-card
```

### 当前产品方向

- 输入：`Markdown + images`
- 输出：单文件 `HTML` 展示形态
- 当前默认模式：`deck`
- 后续目标模式：`roadmap`、`briefing`、`storyflow`
- 当前重点：先把讲解型 deck 主链路做好，再逐步扩展到更多展示模式

---

## ✨ 项目亮点

### 🧠 **AI Agent 驱动的内容规划**
- 不是简单的渲染，而是**智能重组**
- 自动检测输入类型（笔记、文档、原始素材）
- 推荐页面分割方案
- LLM + 启发式双层算法保证可靠性

### 🎨 **专业级设计系统**
```
Dark Card         →  深色卡片风格，适合技术分享
Tech Launch       →  科技发布风格，适合产品发布和 pitch
Editorial Light   →  编辑风格，适合内容讲述
```

这些主题都经过精心设计，响应式布局，支持键盘和触摸导航。

### 📄 **单文件输出**
- 生成的 HTML 是**完全独立的单文件**
- 无需部署服务器，直接分享或邮件发送
- 包含所有 CSS、字体、资源

### 🌍 **中文优化**
- Prompt 工程专为中文优化
- 自然的中文段落拆分
- 中文排版美化

### 🔄 **Fallback 机制**
- 即使 LLM API 失败，仍能生成可用的展示页面
- 自动降级到启发式算法
- 优雅降级，永不失败

---

## 📊 示例

### Dark Card 主题
![Dark Card preview](./assets/previews/dark-card-preview.svg)

示例输出：[examples/01-agent.html](./examples/01-agent.html)

### Editorial Light 主题
![Editorial Light preview](./assets/previews/editorial-light-preview.svg)

示例输出：[examples/01-agent-editorial.html](./examples/01-agent-editorial.html)

---

## 📁 项目结构

```
md-to-html-slides/
├─ agent/                    # AI Agent 核心模块
│  ├─ analyzer.ts           # 内容分析
│  ├─ planner.ts            # 幻灯片规划
│  ├─ expander.ts           # 内容扩展
│  └─ adapters/             # Provider 适配层
├─ templates/               # 主题系统
│  ├─ dark-card.mjs
│  ├─ tech-launch.mjs
│  └─ editorial-light.mjs
├─ scripts/                 # 命令行工具
│  ├─ build.mjs
│  └─ studio-server.mjs
├─ studio/                  # Web 工作室
├─ docs/                    # 详细文档
└─ examples/                # 示例输出
```

---

##  配置和高级用法

### 使用自己的 LLM API

编辑 `.env` 文件：

```bash
# 使用 Moonshot/Kimi（默认）
LLM_PROVIDER=moonshot
LLM_API_KEY=your_key_here
LLM_MODEL=kimi-k2-5
LLM_BASE_URL=https://api.moonshot.cn/v1

# 使用更稳定的原生 JSON 输出模型
# LLM_PROVIDER=openai
# LLM_API_KEY=your_openai_key
# LLM_MODEL=gpt-4.1-mini
# LLM_JSON_MODE=native

# 做 baseline / candidate A/B 对比
# LLM_CANDIDATE_MODEL=gpt-4.1
# npm run check:llm:ab
```

### 自定义 Markdown 格式

查看 `docs/engineering-spec.md` 了解当前支持的 Markdown、CLI 与 Provider 规范。

### 创建自定义主题

主题文件位置：`templates/`

参考现有主题学习如何创建新的样式。

---

## 📚 详细文档

- [文档索引](./docs/README.md)
- [设计原则](./docs/design-principles.md)
- [内部产品原则](./docs/internal-product-principles.zh-CN.md)
- [下一阶段技术策略](./docs/next-technical-strategy.zh-CN.md)
- [工程规范](./docs/engineering-spec.md)

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

**⭐ 如果这个项目对你有帮助，请给个 Star！**
