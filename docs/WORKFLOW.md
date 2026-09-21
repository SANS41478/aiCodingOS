# WORKFLOW · 通用开发流程

> 何时读：开始任务、改变范围、遇到流程问题或准备收工时。  
> 何时更新：流程规则或完成定义变化时。

## 1. 阶段流程

### Discover：发现与核实

目标是把未知变成事实。

必须产出：

- 当前实现和相关文件；
- 外部依赖与约束；
- 已知风险；
- 不能从仓库确认的未知项。

禁止：未探索就假设目录、接口或工具行为。

### Define：定义任务

必须明确：

- 用户目标；
- 任务边界；
- 不在本次范围内的内容；
- 验收标准；
- 风险和回滚方式。

推荐使用 `docs/TASK-TEMPLATE.md`。

### Decide：做出关键选择

只对会影响架构、协议、依赖、数据格式、安全或长期维护的选择建立决策记录。

每个决策至少包含：

- 背景；
- 候选方案；
- 完整优缺点；
- 最晚决策点；
- 最终结论；
- 重新评估条件。

推荐使用 `docs/DECISION-TEMPLATE.md`。

### Build：实现纵向切片

纵向切片是从输入到输出的一条最小可运行链路，而不是只完成某一层的半成品。

规则：

- 优先复用现有能力；
- 高风险未知点先做限时 Spike；
- 保持每次改动可演示；
- 计划外问题只登记，不扩散当前任务。

### Verify：验证结果

至少完成：

- 适配器声明的自动检查；
- 相关逻辑的边界测试；
- 主要用户路径的人工验收；
- 风险回归；
- 证据包整理。

推荐使用 `docs/ACCEPTANCE-TEMPLATE.md`。

### Close：关闭任务

只有所有完成定义满足时，任务才可标记为 `DONE`。

收工必须：

1. 更新 `PLAN.md`；
2. 记录测试、构建、演示和提交证据；
3. 记录未完成事项和后续任务；
4. 使用 `docs/REPORT-TEMPLATE.md` 汇报。

## 2. 状态机

```text
TODO ──开始工作──> DOING ──检查失败/外部阻塞──> BLOCKED
  │                  │                         │
  │                  ├──验收通过───────────────┘
  │                  │
  └──确认取消──────> CANCELLED

DOING ──全部完成定义满足──> DONE
BLOCKED ──阻塞解除───────> DOING
```

不允许直接从 `TODO` 跳到 `DONE`。  
`BLOCKED` 必须写明阻塞条件、影响、负责人和解除条件。  
`CANCELLED` 必须有确认来源或决策记录。

## 3. 完成定义

任务标记 `DONE` 前，必须全部满足：

1. 目标和范围已确认；
2. 验收标准已写入任务；
3. 实现已完成且未留下已知高风险缺口；
4. 自动检查通过；
5. 人工验收通过；
6. 证据包已记录；
7. `PLAN.md`、决策记录和术语表已同步。

## 4. 复用与自研

新增能力按以下顺序判断：

1. 项目已有能力；
2. 已配置的依赖或平台能力；
3. 成熟第三方方案；
4. 上游源码或公开实现作为参考；
5. 最小自研。

选择自研时，任务证据必须说明前四项为何不适用。

## 5. Spike 规则

Spike 是针对高风险未知点的小型验证实验。它的目标是获得结论，不是顺便完成正式功能。

- 时间盒：通常 0.5–2 个工作日；
- 输出：结论、证据、影响范围和下一步；
- 超时：停止扩张，实现阻塞并重新决策；
- 结论：记录在任务证据或 `docs/decisions/`。

## 6. 证据包

证据包是证明任务完成的一组可复查材料，例如测试输出、构建产物、截图、演示地址、提交号、tag 或决策记录。

证据必须能回答：

- 做了什么；
- 如何验证；
- 结果是什么；
- 谁可以复查；
- 如果失败，如何恢复。

## 7. 自动校验

模板提供一个不依赖第三方包的 Node CLI：

```sh
node scripts/workflow.mjs check
node scripts/workflow.mjs status
node scripts/workflow.mjs report
node scripts/workflow.mjs transition T-001 DOING
```

`check` 会验证：

- 必需文件是否存在；
- `workflow.config.yml` 是否包含核心配置段和固定状态；
- JSON Schema 是否可解析；
- `PLAN.md` 的任务 ID 是否唯一；
- 任务状态是否合法；
- `DONE` 任务是否有验收标准和证据；
- `.workflow/state.json` 是否与 `PLAN.md` 同步。

状态迁移通过 `transition` 执行，迁移历史保存在 `.workflow/state.json`。这能阻止常见的非法跳转，但不能阻止用户绕过 CLI 直接编辑文件；因此 CI 或收工前仍应运行 `check`。

## 8. 流程等级

每个任务可以声明一个流程等级；未填写时按 `workflow.config.yml` 的 `defaultProfile` 处理。

| 等级 | 适用场景 | DONE 必需证据 |
| --- | --- | --- |
| Lite | 低风险小改动 | acceptance |
| Standard | 普通功能开发 | test-output、manual-acceptance |
| Critical | 架构、协议、安全、迁移 | test-output、manual-acceptance、decision、rollback |

流程等级不是质量高低，而是风险对应的流程强度。高风险任务不能通过减少文档来“降级”。

## 9. 结构化证据

证据清单保存在 `.workflow/evidence/<任务 ID>.json`。推荐通过 CLI 写入：

```sh
node scripts/workflow.mjs evidence add T-001 test-output "node scripts/workflow.mjs check"
node scripts/workflow.mjs evidence add T-001 manual-acceptance "按验收记录执行"
node scripts/workflow.mjs evidence list T-001
```

如果命令关联了产物路径，CLI 会记录该文件的 SHA-256 摘要，方便确认产物没有被替换。

## 10. 流程指标

```sh
node scripts/workflow.mjs metrics
```

第一版只统计本地状态历史：

- 任务总数与 DONE 数；
- 平均完成时间；
- 累计阻塞时间；
- DONE 任务的证据完整率。

这些指标用于改进流程，不作为个人绩效评分。

## 11. 依赖与协作

任务依赖写在 `PLAN.md` 的“依赖”列中。依赖只表达先后关系，不代表系统会自动调度任务。

```sh
node scripts/workflow.mjs ready
node scripts/workflow.mjs deps T-004
node scripts/workflow.mjs blockers
node scripts/workflow.mjs claim T-004 agent-a
node scripts/workflow.mjs release T-004 agent-a
```

- `ready`：显示依赖全部完成、当前可以开始的 TODO 任务。
- `deps`：显示一个任务的直接依赖和反向依赖。
- `blockers`：显示依赖未完成或被阻塞的任务链。
- `claim/release`：记录负责人，防止同一任务被多人同时领取。

阻塞传播只生成提示，不自动修改下游任务状态；最终状态变化仍由负责人确认。

## 12. 复盘

使用 `docs/RETRO-TEMPLATE.md` 创建周期复盘。复盘应关注流程是否过重、验收是否清晰和证据是否有重复劳动。
