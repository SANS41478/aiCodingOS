#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLAN_PATH = join(ROOT, 'PLAN.md')
const CONFIG_PATH = join(ROOT, 'workflow.config.yml')
const STATE_DIR = join(ROOT, '.workflow')
const STATE_PATH = join(STATE_DIR, 'state.json')
const EVIDENCE_DIR = join(STATE_DIR, 'evidence')
const CLAIMS_PATH = join(STATE_DIR, 'claims.json')
const RETRO_DIR = join(STATE_DIR, 'retros')

const STATUSES = ['TODO', 'DOING', 'BLOCKED', 'DONE', 'CANCELLED']
const PROFILE_NAMES = ['lite', 'standard', 'critical']
const EVIDENCE_TYPES = [
  'acceptance',
  'test-output',
  'manual-acceptance',
  'design-review',
  'build-output',
  'screenshot',
  'demo-url',
  'commit',
  'tag',
  'decision',
  'rollback',
]
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const DESIGN_IMPACTS = ['none', 'consume', 'change', 'new']
const FALLBACK_PROFILES = {
  lite: { requiredEvidence: ['acceptance'], requireDecision: false, requireRollback: false },
  standard: {
    requiredEvidence: ['test-output', 'manual-acceptance'],
    requireDecision: false,
    requireRollback: false,
  },
  critical: {
    requiredEvidence: ['test-output', 'manual-acceptance', 'decision', 'rollback'],
    requireDecision: true,
    requireRollback: true,
  },
}
const TRANSITIONS = {
  TODO: ['DOING', 'CANCELLED'],
  DOING: ['BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['DOING', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
}

const REQUIRED_FILES = [
  'AGENTS.md',
  'PLAN.md',
  'workflow.config.yml',
  'docs/WORKFLOW.md',
  'docs/TASK-TEMPLATE.md',
  'docs/DECISION-TEMPLATE.md',
  'docs/ACCEPTANCE-TEMPLATE.md',
  'docs/REPORT-TEMPLATE.md',
  'docs/RETRO-TEMPLATE.md',
  'docs/GLOSSARY.md',
  'adapters/README.md',
  'schemas/config.schema.json',
    'schemas/task.schema.json',
  'schemas/decision.schema.json',
  'schemas/acceptance.schema.json',
  'schemas/state.schema.json',
  'schemas/profile.schema.json',
  'schemas/evidence.schema.json',
  'schemas/dependency.schema.json',
  'schemas/claim.schema.json',
  'schemas/retro.schema.json',
  '.workflow/claims.json',
  'docs/DESIGN-WORKFLOW.md',
  'design-system/DESIGN-SYSTEM.md',
  'design-system/foundations.md',
  'design-system/components.md',
  'design-system/patterns.md',
  'design-system/accessibility-content.md',
  'design-system/design-system.config.yml',
  'design-system/tokens.yml',
  'design-system/components.yml',
  'schemas/design-system.schema.json',
  'schemas/token.schema.json',
  'schemas/component.schema.json',
]

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exitCode = 1
}

function readText(path) {
  return readFileSync(path, 'utf8')
}

function parseTasks(planText) {
  const tasks = []
  const lines = planText.split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    if (!line.startsWith('|')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    if (!cells[0]?.startsWith('T-') || cells.length < 6) continue
    const status = cells[3]
    if (!STATUSES.includes(status)) continue
    tasks.push({
      id: cells[0],
      phase: cells[1],
      title: cells[2],
      status,
      acceptance: cells[4],
      evidence: cells[5],
      profile: cells[6] || 'standard',
      dependsOn:
        !cells[7] || cells[7] === '-' ? [] : cells[7].split(/[,\s]+/).filter(Boolean),
      owner: !cells[8] || cells[8] === '-' ? '' : cells[8],
      priority: cells[9] || 'normal',
      designImpact: cells[10] || 'none',
      lineIndex: index,
      line,
      cells,
    })
  }

  return { lines, tasks }
}

function readState() {
  if (!existsSync(STATE_PATH)) return null
  try {
    return JSON.parse(readText(STATE_PATH))
  } catch (error) {
    throw new Error(`无法解析 ${STATE_PATH}: ${error.message}`)
  }
}

function readClaims() {
  if (!existsSync(CLAIMS_PATH)) return { schemaVersion: 1, claims: {} }
  try {
    return JSON.parse(readText(CLAIMS_PATH))
  } catch (error) {
    throw new Error(`无法解析 ${CLAIMS_PATH}: ${error.message}`)
  }
}

function writeClaims(claims) {
  mkdirSync(STATE_DIR, { recursive: true })
  claims.updatedAt = new Date().toISOString()
  writeFileSync(CLAIMS_PATH, `${JSON.stringify(claims, null, 2)}\n`, 'utf8')
}

function writeState(tasks, existingState = null) {
  mkdirSync(STATE_DIR, { recursive: true })
  const now = new Date().toISOString()
  const state = existingState ?? {
    schemaVersion: 1,
    initializedAt: now,
    tasks: {},
  }

  for (const task of tasks) {
    const previous = state.tasks[task.id]
    if (!previous) {
      state.tasks[task.id] = {
        status: task.status,
        profile: task.profile,
        history: [{ status: task.status, at: now, reason: 'initialized' }],
      }
      continue
    }
    previous.profile = task.profile
    state.tasks[task.id] = previous
  }

  state.updatedAt = now
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  return state
}

function parseProfiles(text) {
  const profiles = structuredClone(FALLBACK_PROFILES)
  const defaultMatch = text.match(/^\s*defaultProfile:\s*([a-z]+)\s*$/m)
  const defaultProfile = defaultMatch?.[1] ?? 'standard'
  let inProfiles = false
  let currentProfile = null
  let readingEvidence = false

  for (const line of text.split(/\r?\n/)) {
    if (/^  profiles:\s*$/.test(line)) {
      inProfiles = true
      currentProfile = null
      readingEvidence = false
      continue
    }
    if (inProfiles && /^  [a-zA-Z][^:]*:\s*$/.test(line)) {
      inProfiles = false
      currentProfile = null
      readingEvidence = false
    }
    if (!inProfiles) continue

    const profileMatch = line.match(/^    (lite|standard|critical):\s*$/)
    if (profileMatch) {
      currentProfile = profileMatch[1]
      readingEvidence = false
      profiles[currentProfile] = {
        requiredEvidence: [],
        requireDecision: false,
        requireRollback: false,
      }
      continue
    }
    if (!currentProfile) continue

    if (/^      requiredEvidence:\s*$/.test(line)) {
      readingEvidence = true
      continue
    }
    const evidenceMatch = line.match(/^        -\s*(.+?)\s*$/)
    if (readingEvidence && evidenceMatch) {
      profiles[currentProfile].requiredEvidence.push(evidenceMatch[1])
      continue
    }
    const boolMatch = line.match(/^      (requireDecision|requireRollback):\s*(true|false)\s*$/)
    if (boolMatch) {
      readingEvidence = false
      profiles[currentProfile][boolMatch[1]] = boolMatch[2] === 'true'
    }
  }

  return { defaultProfile, profiles }
}

function checkConfig(text) {
  const requiredSections = [
    'templateVersion:',
    'project:',
    'workflow:',
    'defaultProfile:',
    'profiles:',
    'designSystem:',
    'commands:',
    'evidence:',
    'policies:',
  ]
  const missing = requiredSections.filter((section) => !text.includes(section))
  if (missing.length > 0) {
    fail(`workflow.config.yml 缺少配置段：${missing.join(', ')}`)
  }

  for (const status of STATUSES) {
    if (!text.includes(`- ${status}`)) {
      fail(`workflow.config.yml 未声明任务状态：${status}`)
    }
  }
  for (const evidenceType of EVIDENCE_TYPES) {
    if (!text.includes(`- ${evidenceType}`)) {
      fail(`workflow.config.yml 未声明证据类型：${evidenceType}`)
    }
  }

  const { defaultProfile, profiles } = parseProfiles(text)
  if (!PROFILE_NAMES.includes(defaultProfile)) {
    fail(`workflow.config.yml 的 defaultProfile 非法：${defaultProfile}`)
  }
  for (const profileName of PROFILE_NAMES) {
    const profile = profiles[profileName]
    if (!profile || profile.requiredEvidence.length === 0) {
      fail(`workflow.config.yml 未完整声明流程等级：${profileName}`)
    }
  }
  return { defaultProfile, profiles }
}

function checkSchemas() {
  for (const relativePath of REQUIRED_FILES.filter((path) => path.startsWith('schemas/'))) {
    const absolutePath = join(ROOT, relativePath)
    try {
      const schema = JSON.parse(readText(absolutePath))
      if (schema.$schema === undefined || schema.type === undefined) {
        fail(`${relativePath} 不是有效的基础 JSON Schema`)
      }
    } catch (error) {
      fail(`${relativePath} 无法解析：${error.message}`)
    }
  }
}

function checkDesignSystem() {
  const designRoot = join(ROOT, 'design-system')
  const systemText = readText(join(designRoot, 'DESIGN-SYSTEM.md'))
  const configText = readText(join(designRoot, 'design-system.config.yml'))
  const tokensText = readText(join(designRoot, 'tokens.yml'))
  const componentsText = readText(join(designRoot, 'components.yml'))
  const requiredSystemMarkers = [
    '# Product Design System',
    '## 01. Overview',
    '## 25. Design Tokens',
    '## 28–29. AI Design Rules',
    '## 37. Final Rule',
  ]
  for (const marker of requiredSystemMarkers) {
    if (!systemText.includes(marker)) fail(`设计系统缺少必需章节：${marker}`)
  }
  for (const marker of ['product:', 'sources:', 'system:', 'ownership:', 'tokenNaming:']) {
    if (!configText.includes(marker)) fail(`设计系统配置缺少字段：${marker}`)
  }
  if (!tokensText.includes('tokens:')) fail('design-system/tokens.yml 缺少 tokens 根节点')
  const tokenLines = tokensText
    .split(/\r?\n/)
    .map((line) => line.match(/^\s{2}([a-z][a-z0-9-]*(?:\.[a-zA-Z0-9_-]+)+):/))
    .filter(Boolean)
  if (tokenLines.length === 0) fail('design-system/tokens.yml 没有符合命名规则的 Token')
  for (const [, tokenName] of tokenLines) {
    if (!/^[a-z][a-z0-9-]*(?:\.[a-zA-Z0-9_-]+)+$/.test(tokenName)) {
      fail(`Token 命名不符合 category.property.variant.state：${tokenName}`)
    }
  }
  if (!componentsText.includes('components:')) fail('design-system/components.yml 缺少 components 根节点')
}

function checkPlan(planText) {
  const { tasks } = parseTasks(planText)
  if (tasks.length === 0) {
    fail('PLAN.md 未找到任务表；至少需要一条形如 T-001 的任务记录')
    return tasks
  }

  const seen = new Set()
  for (const task of tasks) {
    if (seen.has(task.id)) fail(`PLAN.md 存在重复任务 ID：${task.id}`)
    seen.add(task.id)

    if (!task.phase) fail(`${task.id} 缺少阶段`)
    if (!task.title) fail(`${task.id} 缺少任务标题`)
    if (!STATUSES.includes(task.status)) fail(`${task.id} 使用了非法状态：${task.status}`)
    if (!PROFILE_NAMES.includes(task.profile)) fail(`${task.id} 使用了非法流程等级：${task.profile}`)
    if (!PRIORITIES.includes(task.priority)) fail(`${task.id} 使用了非法优先级：${task.priority}`)
    if (!DESIGN_IMPACTS.includes(task.designImpact)) fail(`${task.id} 使用了非法设计影响：${task.designImpact}`)
    if (!task.acceptance || task.acceptance === '-' || task.acceptance === '待补') {
      fail(`${task.id} 缺少验收标准`)
    }
    if (task.status === 'DONE' && (!task.evidence || task.evidence === '-' || task.evidence === '待补')) {
      fail(`${task.id} 已标记 DONE，但缺少证据`)
    }
  }

  checkDependencies(tasks)
  return tasks
}

function checkDependencies(tasks) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const visiting = new Set()
  const visited = new Set()

  for (const task of tasks) {
    for (const dependencyId of task.dependsOn) {
      if (!taskMap.has(dependencyId)) {
        fail(`${task.id} 依赖了不存在的任务：${dependencyId}`)
      }
    }
  }

  function visit(taskId, path = []) {
    if (visiting.has(taskId)) {
      const cycleStart = path.indexOf(taskId)
      const cycle = [...path.slice(cycleStart), taskId].join(' → ')
      fail(`发现任务依赖循环：${cycle}`)
      return
    }
    if (visited.has(taskId)) return
    const task = taskMap.get(taskId)
    if (!task) return
    visiting.add(taskId)
    for (const dependencyId of task.dependsOn) visit(dependencyId, [...path, taskId])
    visiting.delete(taskId)
    visited.add(taskId)
  }

  for (const task of tasks) visit(task.id)
}

function evidencePath(taskId) {
  return join(EVIDENCE_DIR, `${taskId}.json`)
}

function readEvidence(taskId) {
  const path = evidencePath(taskId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readText(path))
  } catch (error) {
    throw new Error(`无法解析 ${path}: ${error.message}`)
  }
}

function evidenceTypes(taskId) {
  const manifest = readEvidence(taskId)
  if (!manifest || !Array.isArray(manifest.entries)) return new Set()
  return new Set(manifest.entries.map((entry) => entry.type))
}

function checkTaskCompletion(task, profileConfig) {
  if (!task.acceptance || task.acceptance === '-' || task.acceptance === '待补') {
    throw new Error(`${task.id} 缺少验收标准，不能迁移到 DONE`)
  }
  if (!task.evidence || task.evidence === '-' || task.evidence === '待补') {
    throw new Error(`${task.id} 未在 PLAN.md 记录证据位置，不能迁移到 DONE`)
  }

  const profile = profileConfig.profiles[task.profile]
  const recorded = evidenceTypes(task.id)
  const missing = profile.requiredEvidence.filter((type) => !recorded.has(type))
  if (missing.length > 0) {
    throw new Error(`${task.id} 缺少 ${task.profile} 等级证据：${missing.join(', ')}`)
  }
  if (['change', 'new'].includes(task.designImpact) && !recorded.has('design-review')) {
    throw new Error(`${task.id} 涉及设计系统变更，缺少 design-review 证据`)
  }
  if (task.designImpact === 'new' && !recorded.has('decision')) {
    throw new Error(`${task.id} 新增设计资产，缺少 decision 证据`)
  }
  if (profile.requireDecision && !recorded.has('decision')) {
    throw new Error(`${task.id} 为 critical 等级，缺少 decision 证据`)
  }
  if (profile.requireRollback && !recorded.has('rollback')) {
    throw new Error(`${task.id} 为 critical 等级，缺少 rollback 证据`)
  }
}

function checkEvidence(tasks, profileConfig) {
  for (const task of tasks) {
    if (task.status !== 'DONE') continue
    try {
      checkTaskCompletion(task, profileConfig)
    } catch (error) {
      fail(error.message)
    }
  }
}

function checkState(tasks) {
  const state = readState()
  if (!state) {
    console.warn('WARN: 尚未初始化 .workflow/state.json；可运行 `node scripts/workflow.mjs init`')
    return
  }

  for (const task of tasks) {
    const tracked = state.tasks?.[task.id]
    if (!tracked) {
      fail(`${task.id} 未出现在 .workflow/state.json；请运行 init 或通过 CLI 管理状态`)
      continue
    }
    if (tracked.status !== task.status) {
      fail(`${task.id} 的 PLAN 状态 (${task.status}) 与状态历史 (${tracked.status}) 不一致`)
    }
    if (tracked.profile && tracked.profile !== task.profile) {
      fail(`${task.id} 的 PLAN 等级 (${task.profile}) 与状态历史 (${tracked.profile}) 不一致`)
    }
    if (!Array.isArray(tracked.history) || tracked.history.length === 0) {
      fail(`${task.id} 缺少状态历史`)
    }
  }
  checkClaims(tasks)
}

function checkClaims(tasks) {
  const claims = readClaims()
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  for (const [taskId, claim] of Object.entries(claims.claims ?? {})) {
    const task = taskMap.get(taskId)
    if (!task) {
      fail(`claims.json 包含不存在的任务：${taskId}`)
      continue
    }
    if (!claim.owner) fail(`${taskId} 的认领记录缺少负责人`)
    if (task.owner && task.owner !== claim.owner) {
      fail(`${taskId} 的 PLAN 负责人 (${task.owner}) 与认领记录 (${claim.owner}) 不一致`)
    }
    if (['DONE', 'CANCELLED'].includes(task.status)) {
      fail(`${taskId} 已是 ${task.status}，不能保留认领记录`)
    }
  }
}

function commandCheck() {
  let hasError = false
  for (const relativePath of REQUIRED_FILES) {
    if (!existsSync(join(ROOT, relativePath))) {
      console.error(`MISSING: ${relativePath}`)
      hasError = true
    }
  }
  if (hasError) {
    process.exitCode = 1
    return
  }

  const configText = readText(CONFIG_PATH)
  const planText = readText(PLAN_PATH)
  const profileConfig = checkConfig(configText)
  checkSchemas()
  checkDesignSystem()
  const tasks = checkPlan(planText)
  checkState(tasks)
  checkEvidence(tasks, profileConfig)

  if (process.exitCode !== 1) {
    console.log(`OK: workflow template valid (${tasks.length} tasks checked)`)
  }
}

function commandDesignCheck() {
  checkDesignSystem()
  if (process.exitCode === 1) return
  console.log('OK: design system valid')
}

function commandInit() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  if (tasks.length === 0) throw new Error('PLAN.md 未找到任务')
  writeState(tasks)
  console.log(`OK: initialized ${STATE_PATH} (${tasks.length} tasks)`)
}

function commandStatus() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  for (const task of tasks) counts[task.status] += 1

  console.log('Workflow status')
  console.log('---------------')
  for (const status of STATUSES) console.log(`${status.padEnd(10)} ${counts[status]}`)
  console.log('')
  for (const task of tasks) console.log(`${task.id}  ${task.status.padEnd(10)} ${task.title}`)
}

function commandReady() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const ready = tasks.filter(
    (task) =>
      task.status === 'TODO' &&
      task.dependsOn.every((dependencyId) => taskMap.get(dependencyId)?.status === 'DONE'),
  )

  console.log('Ready tasks')
  console.log('------------')
  if (ready.length === 0) {
    console.log('无')
    return
  }
  for (const task of ready) {
    console.log(`${task.id}  [${task.priority}]  ${task.title}`)
  }
}

function commandDeps(taskId) {
  if (!taskId) throw new Error('用法：deps <任务 ID>')
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const task = taskMap.get(taskId)
  if (!task) throw new Error(`找不到任务：${taskId}`)

  const reverse = tasks.filter((candidate) => candidate.dependsOn.includes(taskId))
  console.log(`${task.id}  ${task.title}`)
  console.log(`状态：${task.status}`)
  console.log(`依赖：${task.dependsOn.length > 0 ? task.dependsOn.map((id) => `${id}(${taskMap.get(id)?.status ?? 'MISSING'})`).join(', ') : '无'}`)
  console.log(`下游：${reverse.length > 0 ? reverse.map((candidate) => `${candidate.id}(${candidate.status})`).join(', ') : '无'}`)
}

function commandBlockers() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  let count = 0
  console.log('Task blockers')
  console.log('-------------')
  for (const task of tasks) {
    if (task.status !== 'TODO') continue
    const unmet = task.dependsOn
      .map((dependencyId) => taskMap.get(dependencyId))
      .filter((dependency) => dependency && dependency.status !== 'DONE')
    if (unmet.length === 0) continue
    count += 1
    console.log(`${task.id}  ${task.title}`)
    for (const dependency of unmet) {
      console.log(`  - ${dependency.id}: ${dependency.status}`)
    }
  }
  if (count === 0) console.log('无')
}

function updatePlanOwner(task, owner) {
  const { lines } = parseTasks(readText(PLAN_PATH))
  const cells = task.line.split('|').slice(1, -1).map((cell) => cell.trim())
  while (cells.length < 11) cells.push('-')
  cells[8] = owner || '-'
  lines[task.lineIndex] = `| ${cells.join(' | ')} |`
  writeFileSync(PLAN_PATH, `${lines.join('\n')}\n`, 'utf8')
}

function commandClaim(taskId, owner) {
  if (!taskId || !owner) throw new Error('用法：claim <任务 ID> <负责人>')
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const task = tasks.find((candidate) => candidate.id === taskId)
  if (!task) throw new Error(`找不到任务：${taskId}`)
  if (['DONE', 'CANCELLED'].includes(task.status)) {
    throw new Error(`${taskId} 已是 ${task.status}，不能认领`)
  }

  const claims = readClaims()
  const existing = claims.claims[taskId]
  if (existing && existing.owner !== owner) {
    throw new Error(`${taskId} 已被 ${existing.owner} 认领`)
  }
  const claimedAt = existing?.claimedAt ?? new Date().toISOString()
  claims.claims[taskId] = { owner, claimedAt }
  writeClaims(claims)
  updatePlanOwner(task, owner)
  console.log(`OK: ${taskId} claimed by ${owner}`)
}

function commandRelease(taskId, owner) {
  if (!taskId || !owner) throw new Error('用法：release <任务 ID> <负责人>')
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const task = tasks.find((candidate) => candidate.id === taskId)
  if (!task) throw new Error(`找不到任务：${taskId}`)
  const claims = readClaims()
  const existing = claims.claims[taskId]
  if (!existing) {
    console.log(`NOOP: ${taskId} 当前没有认领记录`)
    return
  }
  if (existing.owner !== owner) {
    throw new Error(`${taskId} 当前由 ${existing.owner} 认领，不能由 ${owner} 释放`)
  }
  delete claims.claims[taskId]
  writeClaims(claims)
  updatePlanOwner(task, '')
  console.log(`OK: ${taskId} released by ${owner}`)
}

function commandRetro() {
  mkdirSync(RETRO_DIR, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  let path = join(RETRO_DIR, `${date}.md`)
  let suffix = 1
  while (existsSync(path)) {
    path = join(RETRO_DIR, `${date}-${suffix}.md`)
    suffix += 1
  }
  const template = readText(join(ROOT, 'docs', 'RETRO-TEMPLATE.md')).replaceAll('YYYY-MM-DD', date)
  writeFileSync(path, template, 'utf8')
  console.log(`OK: created ${path}`)
}

function updatePlanTask(task, nextStatus, reason) {
  const { lines } = parseTasks(readText(PLAN_PATH))
  const cells = task.line.split('|').slice(1, -1).map((cell) => cell.trim())
  cells[3] = nextStatus
  lines[task.lineIndex] = `| ${cells.join(' | ')} |`
  writeFileSync(PLAN_PATH, `${lines.join('\n')}\n`, 'utf8')
  return reason
}

function updatePlanEvidence(task, evidenceLocation) {
  const { lines } = parseTasks(readText(PLAN_PATH))
  const cells = task.line.split('|').slice(1, -1).map((cell) => cell.trim())
  cells[5] = evidenceLocation
  lines[task.lineIndex] = `| ${cells.join(' | ')} |`
  writeFileSync(PLAN_PATH, `${lines.join('\n')}\n`, 'utf8')
}

function commandTransition(taskId, nextStatus, reason = 'manual transition') {
  if (!STATUSES.includes(nextStatus)) throw new Error(`非法目标状态：${nextStatus}`)
  const parsed = parseTasks(readText(PLAN_PATH))
  const task = parsed.tasks.find((candidate) => candidate.id === taskId)
  if (!task) throw new Error(`找不到任务：${taskId}`)
  if (task.status === nextStatus) {
    console.log(`NOOP: ${taskId} 已经是 ${nextStatus}`)
    return
  }
  if (!TRANSITIONS[task.status].includes(nextStatus)) {
    throw new Error(`不允许状态迁移：${task.status} → ${nextStatus}`)
  }
  if (
    nextStatus === 'DONE'
  ) {
    const profileConfig = checkConfig(readText(CONFIG_PATH))
    checkTaskCompletion(task, profileConfig)
  }

  const state = readState() ?? writeState(parsed.tasks)
  const tracked = state.tasks[taskId]
  if (tracked.status !== task.status) {
    throw new Error(`${taskId} 的 PLAN 状态与状态历史不一致，请先运行 check`)
  }

  updatePlanTask(task, nextStatus, reason)
  const now = new Date().toISOString()
  tracked.status = nextStatus
  tracked.profile = task.profile
  tracked.history.push({ status: nextStatus, from: task.status, to: nextStatus, at: now, reason })
  state.updatedAt = now
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  console.log(`OK: ${taskId} ${task.status} → ${nextStatus}`)
}

function hashFile(path) {
  if (!existsSync(path) || !statSync(path).isFile()) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function commandEvidenceAdd(taskId, type, command, result = 'passed', artifactPath = '') {
  if (!taskId || !type || !command) {
    throw new Error('用法：evidence add <任务 ID> <类型> <命令> [结果] [产物路径]')
  }
  if (!EVIDENCE_TYPES.includes(type)) throw new Error(`不支持的证据类型：${type}`)

  const { tasks } = parseTasks(readText(PLAN_PATH))
  const task = tasks.find((candidate) => candidate.id === taskId)
  if (!task) throw new Error(`找不到任务：${taskId}`)

  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const path = evidencePath(taskId)
  const manifest = readEvidence(taskId) ?? {
    schemaVersion: 1,
    taskId,
    entries: [],
  }
  const resolvedArtifact = artifactPath ? resolve(ROOT, artifactPath) : null
  manifest.entries.push({
    type,
    command,
    result,
    capturedAt: new Date().toISOString(),
    artifactPath: artifactPath || null,
    sha256: resolvedArtifact ? hashFile(resolvedArtifact) : null,
  })
  manifest.updatedAt = new Date().toISOString()
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  if (task.evidence === '-' || task.evidence === '待补') {
    updatePlanEvidence(task, `.workflow/evidence/${taskId}.json`)
  }
  console.log(`OK: recorded ${type} evidence for ${taskId}`)
}

function commandEvidenceList(taskId) {
  if (!taskId) throw new Error('用法：evidence list <任务 ID>')
  const manifest = readEvidence(taskId)
  if (!manifest) {
    console.log(`No evidence for ${taskId}`)
    return
  }
  console.log(JSON.stringify(manifest, null, 2))
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return `${days}d ${hours}h ${minutes}m`
}

function commandMetrics() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const profileConfig = checkConfig(readText(CONFIG_PATH))
  const state = readState()
  if (!state) throw new Error('尚未初始化 .workflow/state.json')
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const readyCount = tasks.filter(
    (task) =>
      task.status === 'TODO' &&
      task.dependsOn.every((dependencyId) => taskMap.get(dependencyId)?.status === 'DONE'),
  ).length
  const blockedCount = tasks.filter(
    (task) =>
      task.status === 'TODO' &&
      task.dependsOn.some((dependencyId) => taskMap.get(dependencyId)?.status !== 'DONE'),
  ).length
  const claims = readClaims()

  const now = Date.now()
  const doneTasks = tasks.filter((task) => task.status === 'DONE')
  const durations = []
  let blockedMilliseconds = 0

  for (const task of tasks) {
    const tracked = state.tasks?.[task.id]
    if (!tracked?.history?.length) continue
    const history = tracked.history
    const startedAt = Date.parse(history[0].at)
    const doneEntry = [...history].reverse().find((entry) => entry.status === 'DONE')
    if (doneEntry && Number.isFinite(startedAt)) {
      durations.push(Date.parse(doneEntry.at) - startedAt)
    }
    history.forEach((entry, index) => {
      if (entry.status !== 'BLOCKED') return
      const next = history[index + 1]
      const end = next ? Date.parse(next.at) : now
      const start = Date.parse(entry.at)
      if (Number.isFinite(start) && Number.isFinite(end)) blockedMilliseconds += Math.max(0, end - start)
    })
  }

  const evidenceComplete = doneTasks.filter((task) => {
    try {
      checkTaskCompletion(task, profileConfig)
      return true
    } catch {
      return false
    }
  }).length
  const average = durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0

  console.log('Workflow metrics')
  console.log('----------------')
  console.log(`Tasks total: ${tasks.length}`)
  console.log(`Done: ${doneTasks.length}`)
  console.log(`Average completion time: ${durations.length > 0 ? formatDuration(average) : 'n/a'}`)
  console.log(`Blocked time: ${formatDuration(blockedMilliseconds)}`)
  console.log(`Evidence completeness: ${doneTasks.length > 0 ? `${evidenceComplete}/${doneTasks.length}` : 'n/a'}`)
  console.log(`Ready tasks: ${readyCount}`)
  console.log(`Dependency-blocked TODO: ${blockedCount}`)
  console.log(`Active claims: ${Object.keys(claims.claims ?? {}).length}`)
}

function commandReport() {
  const { tasks } = parseTasks(readText(PLAN_PATH))
  const active = tasks.filter((task) => task.status === 'DOING')
  const blocked = tasks.filter((task) => task.status === 'BLOCKED')
  const next = tasks.find((task) => task.status === 'TODO')

  console.log(`Done：${tasks.filter((task) => task.status === 'DONE').length} 个任务`)
  console.log(`Doing：${active.length > 0 ? active.map((task) => `${task.id} ${task.title}`).join('；') : '无'}`)
  console.log(`Blocked：${blocked.length > 0 ? blocked.map((task) => `${task.id} ${task.title}`).join('；') : '无'}`)
  console.log(`Next：${next ? `${next.id} ${next.title}` : '无'}`)
  console.log('需拍板：请查看 PLAN.md 的“决策队列”')
  console.log('本次新术语：无')
}

function printHelp() {
  console.log(`用法：
  node scripts/workflow.mjs init
  node scripts/workflow.mjs check
  node scripts/workflow.mjs status
  node scripts/workflow.mjs report
  node scripts/workflow.mjs design check
  node scripts/workflow.mjs metrics
  node scripts/workflow.mjs ready
  node scripts/workflow.mjs deps <任务 ID>
  node scripts/workflow.mjs blockers
  node scripts/workflow.mjs claim <任务 ID> <负责人>
  node scripts/workflow.mjs release <任务 ID> <负责人>
  node scripts/workflow.mjs retro
  node scripts/workflow.mjs transition <任务 ID> <目标状态> [原因]
  node scripts/workflow.mjs evidence add <任务 ID> <类型> <命令> [结果] [产物路径]
  node scripts/workflow.mjs evidence list <任务 ID>
`)
}

const [command, ...args] = process.argv.slice(2)

try {
  switch (command) {
    case 'init':
      commandInit()
      break
    case 'check':
      commandCheck()
      break
    case 'status':
      commandStatus()
      break
    case 'report':
      commandReport()
      break
    case 'design':
      if (args[0] === 'check') {
        commandDesignCheck()
      } else {
        throw new Error('用法：design check')
      }
      break
    case 'metrics':
      commandMetrics()
      break
    case 'ready':
      commandReady()
      break
    case 'deps':
      commandDeps(args[0])
      break
    case 'blockers':
      commandBlockers()
      break
    case 'claim':
      commandClaim(args[0], args[1])
      break
    case 'release':
      commandRelease(args[0], args[1])
      break
    case 'retro':
      commandRetro()
      break
    case 'transition':
      commandTransition(args[0], args[1], args.slice(2).join(' ') || undefined)
      break
    case 'evidence':
      if (args[0] === 'add') {
        commandEvidenceAdd(args[1], args[2], args[3], args[4] || 'passed', args[5] || '')
      } else if (args[0] === 'list') {
        commandEvidenceList(args[1])
      } else {
        throw new Error('用法：evidence add|list ...')
      }
      break
    default:
      printHelp()
      if (command) process.exitCode = 1
  }
} catch (error) {
  fail(error.message)
}
