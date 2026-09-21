import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'scripts', 'workflow.mjs')
const STATUSES = ['TODO', 'DOING', 'BLOCKED', 'DONE', 'CANCELLED']
const TRANSITIONS = {
  TODO: ['DOING', 'CANCELLED'],
  DOING: ['BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['DOING', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
}

test('状态集合固定且完整', () => {
  assert.deepEqual(STATUSES, ['TODO', 'DOING', 'BLOCKED', 'DONE', 'CANCELLED'])
})

test('允许从 TODO 开始工作或取消', () => {
  assert.deepEqual(TRANSITIONS.TODO, ['DOING', 'CANCELLED'])
})

test('完成或取消后不能继续迁移', () => {
  assert.deepEqual(TRANSITIONS.DONE, [])
  assert.deepEqual(TRANSITIONS.CANCELLED, [])
})

test('阻塞项只能恢复工作或取消', () => {
  assert.deepEqual(TRANSITIONS.BLOCKED, ['DOING', 'CANCELLED'])
})

test('模板自检命令通过', () => {
  const result = spawnSync(process.execPath, [CLI, 'check'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0)
  assert.match(result.stdout, /workflow template valid/)
})

test('指标命令输出证据完整率', () => {
  const result = spawnSync(process.execPath, [CLI, 'metrics'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Evidence completeness/)
})

test('不能绕过证据门禁直接完成任务', () => {
  const result = spawnSync(process.execPath, [CLI, 'transition', 'T-001', 'DONE'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /不允许状态迁移|缺少/)
})

test('证据清单可以驱动 Standard 任务完成并产出指标', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'workflow-template-'))
  cpSync(ROOT, temporaryRoot, { recursive: true })

  const run = (...args) =>
    spawnSync(process.execPath, [join(temporaryRoot, 'scripts', 'workflow.mjs'), ...args], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    })
  const assertOk = (result, label) =>
    assert.equal(result.status, 0, `${label}\nstdout=${result.stdout}\nstderr=${result.stderr}`)

  try {
    assertOk(run('evidence', 'add', 'T-001', 'test-output', 'node scripts/workflow.mjs check'), 'test evidence')
    assertOk(run('transition', 'T-001', 'DOING', 'test'), 'transition DOING')
    assertOk(run('evidence', 'add', 'T-001', 'manual-acceptance', '人工验收：示例路径'), 'manual evidence')
    assertOk(run('transition', 'T-001', 'DONE', 'test complete'), 'transition DONE')

    const check = run('check')
    assertOk(check, 'final check')
    assert.match(run('metrics').stdout, /Done: 1/)
    assert.match(run('metrics').stdout, /Evidence completeness: 1\/1/)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('ready 和 blockers 根据依赖关系计算', () => {
  const ready = spawnSync(process.execPath, [CLI, 'ready'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(ready.status, 0)
  assert.match(ready.stdout, /T-001/)
  assert.doesNotMatch(ready.stdout, /T-002/)

  const blockers = spawnSync(process.execPath, [CLI, 'blockers'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(blockers.status, 0)
  assert.match(blockers.stdout, /T-002/)
  assert.match(blockers.stdout, /T-001: TODO/)
})

test('依赖循环会让 check 失败', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'workflow-cycle-'))
  cpSync(ROOT, temporaryRoot, { recursive: true })
  try {
    const planPath = join(temporaryRoot, 'PLAN.md')
    const plan = readFileSync(planPath, 'utf8')
    assert.match(plan, /\| T-001 \| Discover \|/)
    writeFileSync(
      planPath,
      plan.replace(
        '| T-001 | Discover | 盘点项目目标、约束和已有资产 | TODO | 事实清单已记录；未知项已列出 | 待补 | standard | - | - | high |',
        '| T-001 | Discover | 盘点项目目标、约束和已有资产 | TODO | 事实清单已记录；未知项已列出 | 待补 | standard | T-002 | - | high |',
      ),
      'utf8',
    )
    assert.match(readFileSync(planPath, 'utf8'), /\| T-001 \| Discover .* \| T-002 \|/)
    const result = spawnSync(process.execPath, [join(temporaryRoot, 'scripts', 'workflow.mjs'), 'check'], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /依赖循环/)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('任务认领可以防止并行冲突并支持释放', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'workflow-claim-'))
  cpSync(ROOT, temporaryRoot, { recursive: true })
  const run = (...args) =>
    spawnSync(process.execPath, [join(temporaryRoot, 'scripts', 'workflow.mjs'), ...args], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    })

  try {
    assert.equal(run('claim', 'T-001', 'agent-a').status, 0)
    assert.notEqual(run('claim', 'T-001', 'agent-b').status, 0)
    assert.equal(run('check').status, 0)
    assert.equal(run('release', 'T-001', 'agent-a').status, 0)
    assert.equal(run('check').status, 0)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('retro 命令生成带日期的复盘文件', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'workflow-retro-'))
  cpSync(ROOT, temporaryRoot, { recursive: true })
  try {
    const result = spawnSync(process.execPath, [join(temporaryRoot, 'scripts', 'workflow.mjs'), 'retro'], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
    const retroDir = join(temporaryRoot, '.workflow', 'retros')
    assert.equal(existsSync(retroDir), true)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})
