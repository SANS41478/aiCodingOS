# Design System Foundations

## Color

颜色分为 Brand、Neutral、Semantic 三类。组件只能引用 Semantic Token。

```text
推荐：color.text.primary / color.surface.default / color.border.default
禁止：在组件中直接写 #171717 / #FFFFFF / #E5E5E5
```

## Typography

| Token | Size | Line Height | Weight | Usage |
| --- | ---: | ---: | ---: | --- |
| text.display.xl | 48px | 56px | 700 | Hero |
| text.display.lg | 40px | 48px | 700 | Large Heading |
| text.heading.xl | 32px | 40px | 700 | H1 |
| text.heading.lg | 24px | 32px | 600 | H2 |
| text.heading.md | 20px | 28px | 600 | H3 |
| text.body.lg | 18px | 28px | 400 | Large Body |
| text.body.md | 16px | 24px | 400 | Body |
| text.body.sm | 14px | 20px | 400 | Secondary |
| text.caption | 12px | 16px | 400 | Caption |

Primary Font：`[Font Name]`  
Secondary Font：`[Font Name]`  
Monospace：`[Font Name]`

## Spacing

使用统一的 `spacing.*` Scale：`0 / 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12 / 16 / 20`，基础单位默认为 4px。

## Layout & Breakpoints

| 设备 | Columns | Gutter | Breakpoint |
| --- | ---: | ---: | ---: |
| Mobile | 4 | 16px | `< 768px` |
| Tablet | 8 | 20px | `768px–1023px` |
| Desktop | 12 | 24px | `≥ 1024px` |
| Wide | 12 | 24px | `≥ 1440px` |

## Radius, Shadow & Border

```text
radius.none / sm / md / lg / xl / 2xl / full
shadow.none / sm / md / lg / xl
border.none / thin / medium
```

具体值只写入 [tokens.yml](tokens.yml)，组件文档引用 Token 名称。

## Iconography

定义 Icon Style、Stroke、Corner 和 `icon.xs / sm / md / lg / xl / 2xl` 尺寸。图标必须说明语义和无障碍标签。

## Illustration & Photography

在产品中使用插画或摄影时，必须声明风格、光线、构图、颜色处理、主体范围和禁止事项。

## Motion

动画应清晰、快速、有目的且不干扰内容。

```text
motion.instant 0ms
motion.fast 100ms
motion.normal 200ms
motion.slow 300ms
motion.emphasis 500ms
```

每个动画必须声明进入、退出和强调 Easing；减少动态偏好下应降低或移除非必要动效。
