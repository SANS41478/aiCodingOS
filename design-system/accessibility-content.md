# Responsive, Accessibility & Content Rules

## Responsive

每个页面必须说明：

- Desktop / Tablet / Mobile 的布局变化；
- 组件是否折叠、重排或替换；
- Typography 是否缩放；
- 触摸目标和交互方式是否变化。

## Accessibility

- 文字与背景满足项目声明的 WCAG AA / AAA 规则；
- 所有交互元素支持 Tab、Enter、Space、Escape；
- 所有可聚焦元素具有明显 Focus State；
- 组件提供正确的语义标签和 ARIA；
- 错误、成功、加载和动态更新可被读屏感知；
- 不依赖颜色作为唯一信息来源。

## Content & Voice

品牌语言应符合产品定义的语气特征；按钮优先使用动作导向文案，避免含糊的“确定”“提交”。

错误消息结构：

```text
发生了什么
+
为什么
+
用户可以做什么
```

## UI States

每一个主要页面和关键组件都必须考虑：

```text
Default
Loading
Empty
Error
Success
Disabled
Offline
```

## Data Visualization

图表必须定义 Chart Style、Semantic Colors、Grid、Labels 和 Tooltip。颜色遵循 Semantic Token，不能把品牌色直接当数据类别色。

## Dark Mode

Dark Mode 从 Semantic Token 派生，不机械反转 Light Hex。至少定义：

```text
color.background.default
color.text.primary
color.border.default
```
