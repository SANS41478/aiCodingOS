# Components & Inventory

## Component Contract

每个组件文档必须包含：

1. Anatomy；
2. Variants；
3. States；
4. Sizes；
5. Behavior；
6. Accessibility；
7. Responsive Rules；
8. Usage / Don'ts；
9. Figma 和 Code 链接。

## Core Components

### Button

Variants：Primary、Secondary、Tertiary、Ghost、Danger。  
Sizes：Small、Medium、Large。  
States：Default、Hover、Focus、Active、Disabled、Loading。  
Anatomy：`[Icon] + Label`。

### Input

Variants：Default、Search、Password、Textarea。  
States：Default、Hover、Focus、Filled、Error、Disabled、Read-only。

### Card

Variants：Default、Interactive、Featured、Compact。

```text
Card
├── Image
├── Header
├── Content
└── Footer
```

### Modal

```text
Modal
├── Header
├── Content
└── Actions
```

### Navigation

分别定义 Desktop、Tablet、Mobile 的导航结构、折叠规则、键盘行为和当前项状态。

## Inventory Rules

- `Planned`：只有需求，不保证设计或代码存在；
- `Draft`：设计已开始，API 可能变化；
- `Beta`：可在受控场景使用；
- `Stable`：设计和代码契约稳定；
- `Deprecated`：不再新增使用，必须声明替代品和迁移期限。

库存事实源为 [components.yml](components.yml)。
