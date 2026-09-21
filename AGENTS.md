# 可复用开发流程模板

> 这是一个技术栈无关的项目协作入口。项目启动后，先复制本模板，再按项目实际情况补充 `workflow.config.yml` 与 `adapters/`。

## 开工必读顺序

1. 本文件：了解项目协作硬规则。
2. `PLAN.md`：查看当前阶段、任务、阻塞和待决策项。
3. `docs/WORKFLOW.md`：确认本次任务所处阶段和阶段门禁。
4. 任务相关文档：协议、架构、依赖、设计或安全规则。

## 核心流程

```text
Discover → Define → Decide → Build → Verify → Close
```

- **Discover**：收集事实，确认当前状态和约束。
- **Define**：明确目标、范围、成功标准和不做事项。
- **Decide**：记录会影响实现的选择和取舍。
- **Build**：以最小纵向切片实现可演示闭环。
- **Verify**：执行自动检查、人工验收和风险回归。
- **Close**：更新台账、补齐证据、提交结果和后续事项。

## 硬规则

1. 先读事实源，再提出方案；能从仓库确认的事实不得靠猜。
2. 每个任务必须有唯一 ID、负责人、状态、验收标准和证据位置。
3. 任务状态只能使用：`TODO`、`DOING`、`BLOCKED`、`DONE`、`CANCELLED`。
4. `DONE` 必须同时满足 `docs/WORKFLOW.md` 的完成定义。
5. 影响架构、协议、依赖、数据格式或安全边界的选择，必须记录决策。
6. 高风险未知点先做限时 Spike（小型验证实验），先求结论再扩大实现。
7. 一个工作会话只处理一个主线；计划外问题进入 `PLAN.md`，不顺手扩散。
8. 自研前必须说明为什么不能复用已有能力或成熟方案。
9. 不提交密钥、token、个人凭据或未经确认的破坏性变更。
10. 新术语首次出现时，用一句人话解释，并补入 `docs/GLOSSARY.md`。

## 会话协议

### 开工

1. 读取本文件、`PLAN.md` 和任务相关文档。
2. 在任务行中补齐目标、范围、验收标准和风险。
3. 输出本次计划，确认阶段门禁和预期证据。
4. 进入 `DOING` 后再开始实现。

### 收工

1. 执行适配器中定义的检查命令。
2. 逐项核对完成定义。
3. 更新 `PLAN.md`、决策记录和证据包。
4. 记录提交、构建产物、测试结果或演示路径。
5. 按 `docs/REPORT-TEMPLATE.md` 汇报。

## 适配器

适配器是把通用流程接到具体技术栈的薄层。它只负责声明命令、工具和证据位置，不改变核心流程。配置见 `workflow.config.yml` 与 `adapters/README.md`。

## 自动化命令

项目根目录提供无第三方依赖的 Node CLI：

```sh
node scripts/workflow.mjs check
node scripts/workflow.mjs status
node scripts/workflow.mjs report
node scripts/workflow.mjs metrics
node scripts/workflow.mjs transition T-001 DOING
node scripts/workflow.mjs evidence add T-001 test-output "node scripts/workflow.mjs check"
node scripts/workflow.mjs ready
node scripts/workflow.mjs blockers
node scripts/workflow.mjs claim T-001 agent-a
```

- `check`：检查模板文件、配置段、Schema、任务表和状态历史。
- `status`：汇总任务状态。
- `report`：生成固定格式的收工摘要。
- `metrics`：统计任务周期、阻塞时间和证据完整率。
- `transition`：按状态机迁移任务，并同步 `PLAN.md` 与 `.workflow/state.json`。
- `evidence`：记录或查看任务的结构化证据清单。
- `ready/deps/blockers`：查看可开始任务、依赖关系和阻塞链。
- `claim/release`：记录或释放任务负责人。
- `retro`：生成周期复盘文件。

状态迁移应通过 `transition` 完成；直接手改任务状态后，`check` 可能报告台账与状态历史不一致。
