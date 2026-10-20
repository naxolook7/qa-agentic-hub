// Ejecución de pruebas estilo TestRail/TestLink: ciclos (runs) con casos,
// resultados por caso y por paso, historial y veredicto de salida. Sin IA.
import { nextNumber, pad, type StoredArtifact } from '../store/model'

export const EXEC_STATUSES = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN'] as const
export type ExecStatus = (typeof EXEC_STATUSES)[number]
export type StepStatus = 'PASSED' | 'FAILED' | 'BLOCKED' | 'NOT_RUN'
export type Verdict = 'GO' | 'CAUTION' | 'NO-GO'

export interface RunData {
  id: string                // RUN-AAAAMMDD-NNN
  name: string
  requirementId: string
  environment: string
  build: string
  executor: string
  testCaseIds: string[]
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  closedAt: string | null
}

export interface ExecutionData {
  executionId: string       // EXE-AAAAMMDD-NNN
  runId: string
  testCaseId: string
  environment: string
  build: string
  executor: string
  executedAt: string        // ISO con zona horaria
  status: ExecStatus
  stepResults: { index: number; status: StepStatus; note: string }[]
  actualResult: string
  comment: string
  evidence: string
  bugId: string | null
}

export interface Step { action: string; expected: string }

/** Fecha local AAAAMMDD (los IDs usan la fecha del QA, no UTC). */
export const dateKey = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`

/** ISO 8601 con offset local, ej. 2026-10-20T15:04:05-03:00 */
export function isoWithOffset(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  const local = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19)
  return `${local}${sign}${pad(Math.floor(abs / 60), 2)}:${pad(abs % 60, 2)}`
}

export function nextRunId(artifacts: StoredArtifact[], d: Date): string {
  const k = dateKey(d)
  return `RUN-${k}-${pad(nextNumber(artifacts, new RegExp(`^RUN-${k}-(\\d+)$`)), 3)}`
}

export function nextExecutionId(artifacts: StoredArtifact[], d: Date): string {
  const k = dateKey(d)
  return `EXE-${k}-${pad(nextNumber(artifacts, new RegExp(`^EXE-${k}-(\\d+)$`)), 3)}`
}

const textOf = (v: unknown): string =>
  v == null ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)

/** Los agentes pueden entregar pasos como texto u objetos con distintos nombres de campo: se normalizan. */
export function normalizeSteps(raw: unknown): Step[] {
  if (!Array.isArray(raw)) return raw ? [{ action: textOf(raw), expected: '' }] : []
  return raw.map((s) => {
    if (typeof s !== 'object' || s === null) return { action: textOf(s), expected: '' }
    const o = s as Record<string, unknown>
    const action = o.action ?? o.step ?? o.description ?? o.text ?? o.paso ?? o.accion ?? ''
    const expected = o.expected ?? o.expectedResult ?? o.resultadoEsperado ?? o.esperado ?? ''
    return { action: textOf(action) || textOf(o), expected: textOf(expected) }
  })
}

export function normalizeList(raw: unknown): string[] {
  if (raw == null || raw === '') return []
  return Array.isArray(raw) ? raw.map(textOf) : [textOf(raw)]
}

/** Última ejecución de cada caso dentro de un ciclo (el historial completo se conserva). */
export function latestByCase(executions: ExecutionData[], runId: string): Map<string, ExecutionData> {
  const latest = new Map<string, ExecutionData>()
  for (const e of executions.filter((x) => x.runId === runId)) {
    const prev = latest.get(e.testCaseId)
    if (!prev || e.executedAt > prev.executedAt || (e.executedAt === prev.executedAt && e.executionId > prev.executionId)) {
      latest.set(e.testCaseId, e)
    }
  }
  return latest
}

export interface RunSummary {
  total: number
  counts: Record<ExecStatus, number>
  pctExecuted: number
  pctPassed: number
  verdict: Verdict
  reasons: string[]
}

const priorityOf = (cases: Map<string, Record<string, unknown>>, id: string) => String(cases.get(id)?.priority ?? 'P4')
const isHigh = (p: string) => p === 'P1' || p === 'P2'

/**
 * Veredicto de salida (recomendación; la decisión es del QA Lead):
 * - NO-GO:   algún caso P1/P2 FAILED, o algún P1 sin ejecutar o BLOCKED.
 * - CAUTION: casos FAILED P3/P4, BLOCKED, SKIPPED P1/P2 o casos pendientes.
 * - GO:      todos ejecutados, sin FAILED ni BLOCKED.
 */
export function summarizeRun(run: RunData, cases: Map<string, Record<string, unknown>>, executions: ExecutionData[]): RunSummary {
  const latest = latestByCase(executions, run.id)
  const counts: Record<ExecStatus, number> = { PASSED: 0, FAILED: 0, BLOCKED: 0, SKIPPED: 0, NOT_RUN: 0 }
  const noGo: string[] = []
  const caution: string[] = []

  for (const id of run.testCaseIds) {
    const status = latest.get(id)?.status ?? 'NOT_RUN'
    counts[status]++
    const p = priorityOf(cases, id)
    if (status === 'FAILED') (isHigh(p) ? noGo : caution).push(`${id} (${p}) FAILED`)
    if (status === 'BLOCKED') (p === 'P1' ? noGo : caution).push(`${id} (${p}) BLOCKED`)
    if (status === 'NOT_RUN') (p === 'P1' ? noGo : caution).push(`${id} (${p}) sin ejecutar`)
    if (status === 'SKIPPED' && isHigh(p)) caution.push(`${id} (${p}) SKIPPED`)
  }

  const total = run.testCaseIds.length
  const executed = total - counts.NOT_RUN
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const verdict: Verdict = noGo.length ? 'NO-GO' : caution.length || total === 0 ? 'CAUTION' : 'GO'
  const reasons = noGo.length ? noGo : caution.length ? caution : total === 0 ? ['El ciclo no tiene casos'] : ['Todos los casos ejecutados sin fallas ni bloqueos']
  return { total, counts, pctExecuted: pct(executed), pctPassed: pct(counts.PASSED), verdict, reasons }
}

/** Borrador de defecto listo para pegar en Jira/Notion. La severidad final la decide el QA. */
export function bugReportMarkdown(tc: Record<string, unknown>, exec: ExecutionData): string {
  const steps = normalizeSteps(tc.steps)
  const failed = exec.stepResults.find((s) => s.status === 'FAILED')
  return [
    `**[${exec.testCaseId}] ${textOf(tc.title)} — falla en ${exec.environment}**`,
    '',
    `- **Ambiente:** ${exec.environment} · **Build:** ${exec.build || 'n/d'}`,
    `- **Ejecución:** ${exec.executionId} (${exec.runId}) · ${exec.executedAt} · ${exec.executor || 'n/d'}`,
    `- **Prioridad del caso:** ${textOf(tc.priority) || 'n/d'} · **Severidad propuesta:** _definir_`,
    '',
    '**Precondiciones**',
    ...normalizeList(tc.preconditions).map((p) => `- ${p}`),
    '',
    '**Pasos para reproducir**',
    ...steps.map((s, i) => `${i + 1}. ${s.action}${failed?.index === i ? '  ← **falla aquí**' : ''}`),
    '',
    `**Resultado esperado:** ${failed && steps[failed.index]?.expected ? steps[failed.index].expected : textOf(tc.expectedResult)}`,
    `**Resultado obtenido:** ${exec.actualResult || '_completar_'}`,
    '',
    `**Evidencia:** ${exec.evidence || '_adjuntar_'}`,
    exec.comment ? `**Comentario:** ${exec.comment}` : '',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function runReportMarkdown(run: RunData, s: RunSummary, cases: Map<string, Record<string, unknown>>, executions: ExecutionData[]): string {
  const latest = latestByCase(executions, run.id)
  const icon: Record<Verdict, string> = { GO: '🟢', CAUTION: '🟡', 'NO-GO': '🔴' }
  return [
    `**${run.id} · ${run.name}** (${run.requirementId})`,
    `Ambiente: ${run.environment} · Build: ${run.build || 'n/d'} · Estado: ${run.status === 'OPEN' ? 'abierto' : 'cerrado'}`,
    '',
    `Ejecutado ${s.pctExecuted}% · Aprobado ${s.pctPassed}% · ✅ ${s.counts.PASSED} · ❌ ${s.counts.FAILED} · ⛔ ${s.counts.BLOCKED} · ⏭ ${s.counts.SKIPPED} · ⏳ ${s.counts.NOT_RUN}`,
    `Recomendación: ${icon[s.verdict]} **${s.verdict}**`,
    ...s.reasons.map((r) => `- ${r}`),
    '',
    '| Caso | Prioridad | Estado | Defecto |',
    '|---|---|---|---|',
    ...run.testCaseIds.map((id) => {
      const e = latest.get(id)
      return `| ${id} ${textOf(cases.get(id)?.title)} | ${priorityOf(cases, id)} | ${e?.status ?? 'NOT_RUN'} | ${e?.bugId ?? ''} |`
    }),
  ].join('\n')
}
