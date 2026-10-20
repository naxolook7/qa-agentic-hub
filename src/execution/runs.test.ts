import { describe, expect, it } from 'vitest'
import type { StoredArtifact } from '../store/model'
import {
  bugReportMarkdown, dateKey, isoWithOffset, latestByCase, nextExecutionId, nextRunId,
  normalizeList, normalizeSteps, runReportMarkdown, summarizeRun, type ExecutionData, type RunData,
} from './runs'

const D = new Date(2026, 9, 20, 15, 30) // 20-oct-2026 local
const src = { mode: 'manual' as const, agent: 'manual', date: '2026-10-20T00:00:00Z' }
const art = (id: string, type: StoredArtifact['type']): StoredArtifact => ({ id, type, version: 1, data: {}, source: src, approvedBy: null })

const run: RunData = {
  id: 'RUN-20261020-001', name: 'Regresión', requirementId: 'REQ-001', environment: 'dev', build: '1.0',
  executor: 'QA', testCaseIds: ['TC-001-001', 'TC-001-002', 'TC-001-003'], status: 'OPEN', createdAt: '', closedAt: null,
}
const cases = new Map<string, Record<string, unknown>>([
  ['TC-001-001', { title: 'Transferir con saldo', priority: 'P1', steps: ['Login', 'Transferir'], expectedResult: 'OK', preconditions: ['Usuario con saldo'] }],
  ['TC-001-002', { title: 'Sin saldo', priority: 'P2' }],
  ['TC-001-003', { title: 'Comprobante', priority: 'P3' }],
])
const exec = (testCaseId: string, status: ExecutionData['status'], executedAt = '2026-10-20T10:00:00-03:00', executionId = 'EXE-20261020-001'): ExecutionData => ({
  executionId, runId: run.id, testCaseId, environment: 'dev', build: '1.0', executor: 'QA', executedAt, status,
  stepResults: [], actualResult: '', comment: '', evidence: '', bugId: null,
})

describe('IDs y fechas', () => {
  it('usa fecha local y numera de forma correlativa por día', () => {
    expect(dateKey(D)).toBe('20261020')
    expect(nextRunId([art('RUN-20261020-001', 'run'), art('RUN-20261019-007', 'run')], D)).toBe('RUN-20261020-002')
    expect(nextExecutionId([], D)).toBe('EXE-20261020-001')
  })
  it('genera ISO con zona horaria', () => {
    expect(isoWithOffset(D)).toMatch(/^2026-10-20T15:30:00[+-]\d{2}:\d{2}$/)
  })
})

describe('normalización de pasos', () => {
  it('acepta texto, objetos con distintos nombres y valores sueltos', () => {
    expect(normalizeSteps(['Abrir app'])).toEqual([{ action: 'Abrir app', expected: '' }])
    expect(normalizeSteps([{ step: 'Ingresar monto', expected: 'Se valida' }])).toEqual([{ action: 'Ingresar monto', expected: 'Se valida' }])
    expect(normalizeSteps([{ action: 'Confirmar', expectedResult: 'Comprobante' }])[0].expected).toBe('Comprobante')
    expect(normalizeSteps('Un solo paso')).toHaveLength(1)
    expect(normalizeSteps(undefined)).toEqual([])
    expect(normalizeList('única')).toEqual(['única'])
  })
})

describe('resumen y veredicto', () => {
  it('sin ejecuciones: P1 pendiente → NO-GO', () => {
    const s = summarizeRun(run, cases, [])
    expect(s.counts.NOT_RUN).toBe(3)
    expect(s.verdict).toBe('NO-GO')
  })
  it('todo PASSED → GO con 100%', () => {
    const s = summarizeRun(run, cases, run.testCaseIds.map((id) => exec(id, 'PASSED')))
    expect(s).toMatchObject({ verdict: 'GO', pctExecuted: 100, pctPassed: 100 })
  })
  it('falla en P3 → CAUTION; falla en P2 → NO-GO', () => {
    const base = [exec('TC-001-001', 'PASSED'), exec('TC-001-002', 'PASSED')]
    expect(summarizeRun(run, cases, [...base, exec('TC-001-003', 'FAILED')]).verdict).toBe('CAUTION')
    expect(summarizeRun(run, cases, [exec('TC-001-001', 'PASSED'), exec('TC-001-002', 'FAILED'), exec('TC-001-003', 'PASSED')]).verdict).toBe('NO-GO')
  })
  it('usa la última ejecución del caso (re-test que pasa)', () => {
    const history = [
      exec('TC-001-001', 'FAILED', '2026-10-20T10:00:00-03:00', 'EXE-20261020-001'),
      exec('TC-001-001', 'PASSED', '2026-10-20T11:00:00-03:00', 'EXE-20261020-002'),
    ]
    expect(latestByCase(history, run.id).get('TC-001-001')?.status).toBe('PASSED')
  })
  it('ciclo vacío → CAUTION', () => {
    expect(summarizeRun({ ...run, testCaseIds: [] }, cases, []).verdict).toBe('CAUTION')
  })
})

describe('reportes', () => {
  it('el borrador de defecto marca el paso que falla', () => {
    const e = { ...exec('TC-001-001', 'FAILED'), actualResult: 'Error 500', stepResults: [{ index: 1, status: 'FAILED' as const, note: '' }] }
    const md = bugReportMarkdown(cases.get('TC-001-001')!, e)
    expect(md).toContain('2. Transferir  ← **falla aquí**')
    expect(md).toContain('Error 500')
    expect(md).toContain('Usuario con saldo')
  })
  it('el reporte del ciclo incluye veredicto y tabla', () => {
    const s = summarizeRun(run, cases, [])
    const md = runReportMarkdown(run, s, cases, [])
    expect(md).toContain('NO-GO')
    expect(md).toContain('| TC-001-002 Sin saldo | P2 | NOT_RUN |  |')
  })
})
