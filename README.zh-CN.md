# md-to-html-slides

[English](./README.md) | 中文

从 Markdown 一键生成高质量 HTML 演示文稿。

## 🎯 项目介绍

**md-to-html-slides** 是一个 AI 驱动的演示文稿生成系统。

只需写一份 Markdown 笔记，系统会自动：
- 🧠 理解内容结构
- 📋 规划幻灯片布局
- ✨ 生成专业级 HTML 演示文稿
- 📱 响应式设计，支持各种设备

与传统工具不同，这不只是 Markdown 转 HTML —— 它是一个**智能规划引擎**，能理解你的内容意图并重新组织，让演示更有说服力。

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
- 右侧实时预览
- 主题实时切换
- 一键导出 HTML

### 3. 命令行生成演示文稿
```bash
# 使用 dark-card 主题
npm run build:example

# 使用 editorial-light 主题
npm run build:example:editorial

# 预览演示文稿
npm run preview:example

# 验证 Markdown 结构
npm run validate:example
```

### 4. 用自己的内容
```bash
node ./scripts/build.mjs build ./your-file.md -o ./output.html --theme dark-card
```

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
Editorial Light   →  编辑风格，适合内容讲述
```

两套主题都经过精心设计，响应式布局，支持键盘和触摸导航。

### 📄 **单文件输出**
- 生成的 HTML 是**完全独立的单文件**
- 无需部署服务器，直接分享或邮件发送
- 包含所有 CSS、字体、资源

### 🌍 **中文优化**
- Prompt 工程专为中文优化
- 自然的中文段落拆分
- 中文排版美化

### 🔄 **Fallback 机制**
- 即使 LLM API 失败，仍能生成可用的演示文稿
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
│  └─ moonshot-client.ts    # LLM 调用
├─ templates/               # 主题系统
│  ├─ dark-card.mjs
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
KIMI_API_KEY=your_key_here
KIMI_MODEL=kimi-k2-5
KIMI_BASE_URL=https://api.moonshot.cn/v1

# 或使用其他 Provider（即将支持）
# LLM_PROVIDER=openai
# LLM_API_KEY=your_key
```

### 自定义 Markdown 格式

查看 `docs/markdown-spec.md` 了解支持的 Markdown 语法和最佳实践。

### 创建自定义主题

主题文件位置：`templates/`

参考现有主题学习如何创建新的样式。

---

## 📚 详细文档

- [Agent 系统架构](./docs/agent-orchestration-spec.md)
- [Markdown 格式规范](./docs/markdown-spec.md)
- [LLM Provider 规范](./docs/llm-provider-spec.md)
- [幻灯片设计规范](./docs/slide-planning-spec.md)

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
