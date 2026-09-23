# DESIGN-WORKFLOW · 设计系统协作流程

> 何时读：创建或修改 UI、Token、组件、Pattern、页面模板、Figma 资源时。  
> 何时更新：设计系统结构、Source of Truth 或设计门禁变化时。

## 1. Source of Truth

设计系统入口为 `design-system/DESIGN-SYSTEM.md`。

机器可读事实源：

- `design-system/design-system.config.yml`：版本、来源、Owner、系统规则；
- `design-system/tokens.yml`：Token 名称和值；
- `design-system/components.yml`：组件库存和状态；
- `design-system/*.md`：组件、基础、模式和无障碍规则。

## 2. UI 任务声明

任务必须在 `PLAN.md` 的“设计影响”列声明：

| 值 | 含义 | 最低要求 |
| --- | --- | --- |
| none | 不涉及 UI | 普通任务流程 |
| consume | 只复用已有设计资产 | 记录使用了哪些 Token/组件 |
| change | 修改已有设计资产 | 设计评审证据 |
| new | 新增设计资产 | 设计评审 + 决策记录 + 更新库存 |

## 3. AI / Agent 规则

开始 UI 工作前，按顺序：

1. 查 `tokens.yml`；
2. 查 `components.yml`；
3. 查对应组件或 Pattern 文档；
4. 判断是否能用 Variant 表达；
5. 只有无法复用时才创建新资产；
6. 新资产必须更新设计系统和任务证据。

## 4. 验证命令

```sh
node scripts/workflow.mjs design check
node scripts/workflow.mjs check
```

`design check` 验证入口文档、配置、Token 命名、组件状态和必需模式是否存在。

## 5. 设计变更证据

设计变更至少记录：

- 变更前后对比或截图；
- 使用/修改的 Token 或组件；
- Figma / Code 位置；
- 可访问性和响应式检查；
- 必要时的 ADR。

证据类型使用 `design-review`。
