# Product Design System

> 产品名称：`[Product Name]`  
> 产品版本：`v0.1.0`  
> 文档版本：`v0.1.0`  
> 最后更新：`2026-09-23`  
> 维护者：`[Name / Team]`  
> Figma：`[Figma URL]`  
> Repository：`[Repository URL]`

## 01. Overview

本设计系统统一产品在 Web、Desktop、Mobile 等平台上的视觉语言、交互规范和组件实现。

目标：

- 保持品牌视觉和交互一致；
- 优先复用 Token、组件和页面模式；
- 降低设计与开发沟通成本；
- 为 AI / Agent 提供可验证的设计约束；
- 让设计决策、Figma 资源和代码实现保持可追溯。

### Design Principles

1. **Reuse before inventing**：先查 Token、组件和 Pattern，再创建新元素。
2. **Semantic over literal**：组件使用语义 Token，不直接写 Hex、尺寸或阴影值。
3. **States are designed**：默认、加载、空、错误、成功、禁用、离线都必须有定义。
4. **Accessible by default**：颜色、键盘、Focus、读屏和响应式行为在设计时确定。

## 02. Brand Identity

| 项目 | 内容 |
| --- | --- |
| Brand Name | `[Product Name]` |
| Tagline | `[Brand Tagline]` |
| Brand Description | `[一句话介绍品牌]` |
| Target Audience | `[目标用户]` |
| Personality | `[Personality 01]` · `[Personality 02]` · `[Personality 03]` |
| Keywords | `[Keyword]` · `[Keyword]` · `[Keyword]` |

## 03. Logo

定义 Primary Logo、Secondary Logo、Icon / Symbol 和 Monochrome Logo 的用途、清晰空间、最小尺寸、允许背景和禁止用法。

禁止：拉伸、压缩、改变比例、任意换色、添加未定义阴影或描边、放在低对比度背景上。

## 04–14. Foundations

基础视觉规范拆分在 [foundations.md](foundations.md)，包括：

- Brand / Neutral / Semantic Color；
- Typography、Font Weight、Type Scale；
- Spacing、Grid、Breakpoints；
- Radius、Shadow、Border；
- Iconography；
- Illustration、Graphic Language、Photography；
- Motion、Duration、Easing。

## 15–18. Components, Patterns & Templates

组件必须定义：

- Anatomy；
- Variants；
- States；
- Sizes；
- Behavior；
- Accessibility；
- Responsive Rules。

组件、状态和页面模式见 [components.md](components.md) 与 [patterns.md](patterns.md)。

组件库存见 [components.yml](components.yml)。状态使用 `Planned`、`Draft`、`Beta`、`Stable`、`Deprecated`。

## 19–24. Responsive, Accessibility & Modes

每个页面和组件必须说明 Desktop、Tablet、Mobile 的布局、字体和行为变化。

必须覆盖：

- WCAG AA / AAA 或项目明确的对比度规则；
- Tab、Enter、Space、Escape；
- 明显的 Focus State；
- ARIA / Screen Reader 语义；
- Light / Dark Semantic Token 映射；
- Default、Loading、Empty、Error、Success、Disabled、Offline。

详细规则见 [accessibility-content.md](accessibility-content.md)。

## 25. Design Tokens

Token 命名统一为：

```text
category.property.variant.state
```

优先使用三层 Token：

1. **Global Tokens**：基础值，如 `blue.500`、`spacing.4`；
2. **Semantic Tokens**：产品语义，如 `color.text.primary`；
3. **Component Tokens**：组件专属值，如 `button.primary.background`。

机器可读 Token 见 [tokens.yml](tokens.yml)。

## 26–27. Figma Structure & Naming

推荐页面：

```text
00 — Cover
01 — Foundations
02 — Tokens
03 — Components
04 — Patterns
05 — Templates
06 — Screens
07 — Playground
08 — Archive
```

组件命名示例：

```text
Button / Primary
Input / Error
Card / Featured
```

Variant 属性优先使用 `Type`、`Size`、`State`、`Icon`。

## 28–29. AI Design Rules

AI 生成 UI 时：

1. 先查 `tokens.yml`；
2. 再查 `components.yml` 和组件文档；
3. 可以用 Variant 表达时，不创建新组件；
4. 不随意增加颜色、字体、Spacing、Radius、Shadow；
5. 新组件必须记录设计决策、使用理由、Figma 和代码位置；
6. UI 任务在 `PLAN.md` 中声明 `designImpact`：
   - `none`：不涉及 UI；
   - `consume`：只复用现有系统；
   - `change`：修改现有 Token / 组件 / Pattern；
   - `new`：新增设计资产。

决策路径：

```text
已有相同组件？
  ├─ 是 → 直接复用
  └─ 否 → Variant 能表达？
           ├─ 是 → 创建 Variant
           └─ 否 → 创建新组件并记录 ADR
```

## 30–32. Decision, Deprecated & Changelog

重要设计决策记录在 `docs/decisions/`，废弃项记录在本文件的 Deprecated 区域，版本变化记录在 Changelog。

## 33. System Status

```text
Foundations      ✅
Design Tokens    ✅
Components       🟡
Patterns         🟡
Templates        ⏳
Documentation    🟡
Figma Library    🟡
Code Library     ⏳
AI Rules         ✅
Accessibility    🟡
Dark Mode        ⏳
```

## 34–36. Quick Reference, Source of Truth & Ownership

所有产品应在 [design-system.config.yml](design-system.config.yml) 中填写：

- Brand / Figma / Token / Component / Code / Documentation 的 Source of Truth；
- Brand、Visual、UI、Figma、Frontend、Documentation 的 Owner 和 Contact；
- 当前版本、更新时间和维护者。

## 37. Final Rule

> **When in doubt, reuse before inventing.**

任何新的 Color、Font、Spacing、Radius、Shadow、Component、Pattern 或 Interaction，都必须先确认现有系统无法合理表达，再记录设计决策。
