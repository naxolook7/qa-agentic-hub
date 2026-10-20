import { useMemo, useState } from 'react'
import { VARS } from '../config'
import {
  bugReportMarkdown, isoWithOffset, latestByCase, nextExecutionId, nextRunId, normalizeSteps, runReportMarkdown,
  summarizeRun, type ExecStatus, type ExecutionData, type RunData, type StepStatus,
} from '../execution/runs'
import type { StoredArtifact } from '../store/model'
import { TestCaseCard } from './TestCaseCard'

interface Props {
  artifacts: StoredArtifact[]
  onSave: (next: StoredArtifact[]) => Promise<void>
}

const STATUS_LABEL: Record<ExecStatus, string> = {
  PASSED: '✅ Aprobado', FAILED: '❌ Fallido', BLOCKED: '⛔ Bloqueado', SKIPPED: '⏭ Omitido', NOT_RUN: '⏳ Sin ejecutar',
}
const split = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const manual = (agent: string) => ({ mode: 'manual' as const, agent, date: new Date().toISOString() })

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function ExecutionsPanel({ artifacts, onSave }: Props) {
  const [runId, setRunId] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)

  const runs = artifacts.filter((a) => a.type === 'run').map((a) => a.data as unknown as RunData).sort((a, b) => b.id.localeCompare(a.id))
  const executions = artifacts.filter((a) => a.type === 'execution').map((a) => a.data as unknown as ExecutionData)
  const cases = useMemo(
    () => new Map(artifacts.filter((a) => a.type === 'testcase').map((a) => [a.id, a.data])),
    [artifacts],
  )
  const run = runs.find((r) => r.id === runId) ?? null

  if (run && caseId) {
    return (
      <ExecuteCase
        key={`${run.id}-${caseId}`}
        run={run}
        caseId={caseId}
        tc={cases.get(caseId) ?? { id: caseId, title: '(caso eliminado)' }}
        executions={executions}
        artifacts={artifacts}
        onSave={onSave}
        onBack={() => setCaseId(null)}
        onNext={(id) => setCaseId(id)}
      />
    )
  }
  if (run) {
    return <RunView run={run} cases={cases} executions={executions} artifacts={artifacts} onSave={onSave} onBack={() => setRunId(null)} onOpenCase={setCaseId} />
  }
  return <RunList runs={runs} cases={cases} executions={executions} artifacts={artifacts} onSave={onSave} onOpen={setRunId} />
}

/* ---------- Lista de ciclos + creación ---------- */

function RunList({ runs, cases, executions, artifacts, onSave, onOpen }: {
  runs: RunData[]; cases: Map<string, Record<string, unknown>>; executions: ExecutionData[]
  artifacts: StoredArtifact[]; onSave: Props['onSave']; onOpen: (id: string) => void
}) {
  const [creating, setCreating] = useState(runs.length === 0)
  return (
    <section className="panel">
      <div className="row between">
        <h3>Ciclos de prueba</h3>
        {!creating && <button className="primary" onClick={() => setCreating(true)}>+ Nuevo ciclo</button>}
      </div>
      {creating && <NewRunForm artifacts={artifacts} onSave={onSave} onCreated={onOpen} onCancel={runs.length ? () => setCreating(false) : undefined} />}
      {runs.length > 0 && (
        <table>
          <thead><tr><th>Ciclo</th><th>Nombre</th><th>REQ</th><th>Ambiente</th><th>Avance</th><th>Recomendación</th><th>Estado</th></tr></thead>
          <tbody>
            {runs.map((r) => {
              const s = summarizeRun(r, cases, executions)
              return (
                <tr key={r.id} className="clickable" onClick={() => onOpen(r.id)}>
                  <td><code>{r.id}</code></td>
                  <td>{r.name}</td>
                  <td>{r.requirementId}</td>
                  <td>{r.environment}</td>
                  <td><Progress counts={s.counts} total={s.total} /> <span className="muted">{s.pctExecuted}%</span></td>
                  <td><span className={`verdict v-${s.verdict}`}>{s.verdict}</span></td>
                  <td>{r.status === 'OPEN' ? 'Abierto' : 'Cerrado'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

function NewRunForm({ artifacts, onSave, onCreated, onCancel }: {
  artifacts: StoredArtifact[]; onSave: Props['onSave']; onCreated: (id: string) => void; onCancel?: () => void
}) {
  const forbidden = split(VARS.FORBIDDEN_ENVIRONMENTS).map((e) => e.toLowerCase())
  const envs = split(VARS.ALLOWED_ENVIRONMENTS).filter((e) => !forbidden.includes(e.toLowerCase()))
  const reqs = artifacts.filter((a) => a.type === 'requirement')
  const [reqId, setReqId] = useState(reqs[0]?.id ?? '')
  const [name, setName] = useState('')
  const [env, setEnv] = useState(envs[0] ?? '')
  const [build, setBuild] = useState('')
  const [executor, setExecutor] = useState('')
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [error, setError] = useState('')

  const num = reqId.replace('REQ-', '')
  const reqCases = artifacts.filter((a) => a.type === 'testcase' && a.id.startsWith(`TC-${num}-`)).sort((a, b) => a.id.localeCompare(b.id))
  const chosen = selected ?? new Set(reqCases.map((c) => c.id))
  const toggle = (id: string) => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n) }
  const pick = (prios: string[] | null) =>
    setSelected(new Set(reqCases.filter((c) => !prios || prios.includes(String(c.data.priority))).map((c) => c.id)))

  const create = async () => {
    if (!reqId) return setError('Primero crea un requerimiento con sus casos de prueba desde el Puente.')
    if (!env) return setError('No hay ambientes permitidos en profile.yaml (ALLOWED_ENVIRONMENTS).')
    if (chosen.size === 0) return setError('Selecciona al menos un caso.')
    const now = new Date()
    const id = nextRunId(artifacts, now)
    const data: RunData = {
      id, name: name.trim() || `Ciclo ${reqId} · ${env}`, requirementId: reqId, environment: env, build: build.trim(),
      executor: executor.trim(), testCaseIds: reqCases.map((c) => c.id).filter((c) => chosen.has(c)),
      status: 'OPEN', createdAt: isoWithOffset(now), closedAt: null,
    }
    await onSave([...artifacts, { id, type: 'run', version: 1, data: data as unknown as Record<string, unknown>, source: manual('execution-run'), approvedBy: null }])
    onCreated(id)
  }

  return (
    <div className="form-box">
      <h4>Nuevo ciclo de prueba</h4>
      <div className="row">
        <label>Requerimiento
          <select value={reqId} onChange={(e) => { setReqId(e.target.value); setSelected(null) }}>
            {reqs.length === 0 && <option value="">— sin requerimientos —</option>}
            {reqs.map((r) => <option key={r.id} value={r.id}>{r.id} · {String(r.data.title ?? '')}</option>)}
          </select>
        </label>
        <label>Nombre del ciclo<input value={name} placeholder={`Ciclo ${reqId || 'REQ'} · ${env}`} onChange={(e) => setName(e.target.value)} /></label>
        <label>Ambiente
          <select value={env} onChange={(e) => setEnv(e.target.value)}>
            {envs.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <label>Build / versión<input value={build} placeholder="ej. 1.4.2" onChange={(e) => setBuild(e.target.value)} /></label>
        <label>Ejecutor<input value={executor} placeholder="Tu nombre" onChange={(e) => setExecutor(e.target.value)} /></label>
      </div>
      <p className="muted">Ambientes disponibles según profile.yaml. Prohibidos: {forbidden.join(', ') || 'ninguno'}.</p>

      <div className="row between">
        <strong>Casos incluidos ({chosen.size} de {reqCases.length})</strong>
        <span>
          <button className="link" onClick={() => pick(null)}>Todos</button> ·{' '}
          <button className="link" onClick={() => pick(['P1', 'P2'])}>Solo P1–P2</button> ·{' '}
          <button className="link" onClick={() => setSelected(new Set())}>Ninguno</button>
        </span>
      </div>
      {reqCases.length === 0 ? (
        <p className="muted">Este requerimiento aún no tiene casos. Créalos con el agente “Diseño de casos”.</p>
      ) : (
        <ul className="case-picker">
          {reqCases.map((c) => (
            <li key={c.id}>
              <label className="check">
                <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} />
                <code>{c.id}</code> <span className={`chip prio-${String(c.data.priority)}`}>{String(c.data.priority ?? '—')}</span> {String(c.data.title ?? '')}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="result bad">{error}</p>}
      <div className="row">
        <button className="primary" onClick={create}>Crear ciclo</button>
        {onCancel && <button onClick={onCancel}>Cancelar</button>}
      </div>
    </div>
  )
}

/* ---------- Vista de un ciclo ---------- */

function RunView({ run, cases, executions, artifacts, onSave, onBack, onOpenCase }: {
  run: RunData; cases: Map<string, Record<string, unknown>>; executions: ExecutionData[]
  artifacts: StoredArtifact[]; onSave: Props['onSave']; onBack: () => void; onOpenCase: (id: string) => void
}) {
  const [msg, setMsg] = useState('')
  const s = summarizeRun(run, cases, executions)
  const latest = latestByCase(executions, run.id)
  const firstPending = run.testCaseIds.find((id) => !latest.has(id))

  const setStatus = async (status: RunData['status']) => {
    const data: RunData = { ...run, status, closedAt: status === 'CLOSED' ? isoWithOffset(new Date()) : null }
    await onSave(artifacts.map((a) => (a.id === run.id ? { ...a, version: a.version + 1, data: data as unknown as Record<string, unknown> } : a)))
  }
  const copyReport = async () => {
    const ok = await copyText(runReportMarkdown(run, s, cases, executions))
    setMsg(ok ? 'Reporte copiado. Pégalo en Slack, Jira o Notion.' : 'No se pudo copiar al portapapeles.')
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Ciclos</button>
      <div className="row between">
        <div>
          <h3><code>{run.id}</code> · {run.name}</h3>
          <p className="muted">{run.requirementId} · Ambiente <strong>{run.environment}</strong> · Build {run.build || 'n/d'} · Ejecutor {run.executor || 'n/d'} · {run.status === 'OPEN' ? 'Abierto' : `Cerrado ${run.closedAt ?? ''}`}</p>
        </div>
        <div className="row">
          {run.status === 'OPEN' && firstPending && <button className="primary" onClick={() => onOpenCase(firstPending)}>▶ Ejecutar siguiente pendiente</button>}
          <button onClick={copyReport}>Copiar reporte</button>
          {run.status === 'OPEN'
            ? <button onClick={() => confirm('¿Cerrar el ciclo? Ya no se podrán registrar resultados (puedes reabrirlo).') && setStatus('CLOSED')}>Cerrar ciclo</button>
            : <button onClick={() => setStatus('OPEN')}>Reabrir ciclo</button>}
        </div>
      </div>
      {msg && <p className="notice">{msg}</p>}

      <div className="summary-grid">
        <div>
          <Progress counts={s.counts} total={s.total} big />
          <p className="muted">
            Ejecutado {s.pctExecuted}% · Aprobado {s.pctPassed}% ·{' '}
            {(Object.keys(STATUS_LABEL) as ExecStatus[]).map((k) => `${STATUS_LABEL[k]} ${s.counts[k]}`).join(' · ')}
          </p>
        </div>
        <div className={`verdict-box v-${s.verdict}`}>
          <strong>Recomendación: {s.verdict}</strong>
          <ul>{s.reasons.slice(0, 5).map((r) => <li key={r}>{r}</li>)}</ul>
          {s.reasons.length > 5 && <p className="muted">y {s.reasons.length - 5} más…</p>}
          <p className="muted">La decisión final es del QA Lead.</p>
        </div>
      </div>

      <table>
        <thead><tr><th>Caso</th><th>Título</th><th>Prioridad</th><th>Estado</th><th>Última ejecución</th><th>Defecto</th></tr></thead>
        <tbody>
          {run.testCaseIds.map((id) => {
            const e = latest.get(id)
            const tc = cases.get(id)
            return (
              <tr key={id} className="clickable" onClick={() => onOpenCase(id)}>
                <td><code>{id}</code></td>
                <td>{String(tc?.title ?? '(caso eliminado)')}</td>
                <td><span className={`chip prio-${String(tc?.priority)}`}>{String(tc?.priority ?? '—')}</span></td>
                <td><span className={`status s-${e?.status ?? 'NOT_RUN'}`}>{STATUS_LABEL[e?.status ?? 'NOT_RUN']}</span></td>
                <td className="muted">{e ? `${e.executedAt.replace('T', ' ').slice(0, 16)} · ${e.executor || ''}` : '—'}</td>
                <td>{e?.bugId ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

/* ---------- Ejecución de un caso ---------- */

function ExecuteCase({ run, caseId, tc, executions, artifacts, onSave, onBack, onNext }: {
  run: RunData; caseId: string; tc: Record<string, unknown>; executions: ExecutionData[]
  artifacts: StoredArtifact[]; onSave: Props['onSave']; onBack: () => void; onNext: (id: string) => void
}) {
  const steps = normalizeSteps(tc.steps)
  const [stepStatus, setStepStatus] = useState<StepStatus[]>(() => steps.map(() => 'NOT_RUN'))
  const [manualStatus, setManualStatus] = useState<ExecStatus | null>(null)
  const [actual, setActual] = useState('')
  const [evidence, setEvidence] = useState('')
  const [comment, setComment] = useState('')
  const [bugId, setBugId] = useState('')
  const [saved, setSaved] = useState<ExecutionData | null>(null)
  const [msg, setMsg] = useState('')

  const history = executions.filter((e) => e.runId === run.id && e.testCaseId === caseId).sort((a, b) => b.executedAt.localeCompare(a.executedAt))
  const suggested: ExecStatus | null = stepStatus.includes('FAILED') ? 'FAILED'
    : stepStatus.includes('BLOCKED') ? 'BLOCKED'
    : steps.length > 0 && stepStatus.every((s) => s === 'PASSED') ? 'PASSED' : null
  const status = manualStatus ?? suggested
  const closed = run.status === 'CLOSED'
  const idx = run.testCaseIds.indexOf(caseId)
  const nextId = run.testCaseIds[idx + 1]

  const setStep = (i: number, s: StepStatus) => setStepStatus((prev) => prev.map((p, j) => (j === i ? (p === s ? 'NOT_RUN' : s) : p)))

  const save = async () => {
    if (!status) return setMsg('Elige el estado del caso (o marca los pasos).')
    if (status === 'FAILED' && !actual.trim()) return setMsg('Para un caso fallido, describe el resultado obtenido.')
    const now = new Date()
    const data: ExecutionData = {
      executionId: nextExecutionId(artifacts, now), runId: run.id, testCaseId: caseId,
      environment: run.environment, build: run.build, executor: run.executor, executedAt: isoWithOffset(now), status,
      stepResults: stepStatus.map((s, i) => ({ index: i, status: s, note: '' })).filter((s) => s.status !== 'NOT_RUN'),
      actualResult: actual.trim(), comment: comment.trim(), evidence: evidence.trim(), bugId: bugId.trim() || null,
    }
    await onSave([...artifacts, { id: data.executionId, type: 'execution', version: 1, data: data as unknown as Record<string, unknown>, source: manual('execution-tracker'), approvedBy: null }])
    setSaved(data)
    setMsg(`Resultado guardado como ${data.executionId}.`)
  }

  const copyBug = async () => {
    if (!saved) return
    const ok = await copyText(bugReportMarkdown(tc, saved))
    setMsg(ok ? 'Borrador de defecto copiado. Pégalo en Jira o Notion y registra el ID del defecto en una nueva ejecución si corresponde.' : 'No se pudo copiar al portapapeles.')
  }

  const stepButtons = (i: number) => (
    <span className="step-btns">
      {(['PASSED', 'FAILED', 'BLOCKED'] as const).map((s) => (
        <button key={s} disabled={closed || !!saved} title={STATUS_LABEL[s]}
          className={`mini ${stepStatus[i] === s ? `on s-${s}` : ''}`} onClick={() => setStep(i, s)}>
          {s === 'PASSED' ? '✓' : s === 'FAILED' ? '✗' : '⛔'}
        </button>
      ))}
    </span>
  )

  return (
    <section className="panel">
      <div className="row between">
        <button className="link" onClick={onBack}>← {run.id}</button>
        <span className="muted">Caso {idx + 1} de {run.testCaseIds.length} · Ambiente <strong>{run.environment}</strong> · Build {run.build || 'n/d'}</span>
      </div>
      {closed && <p className="result warn">El ciclo está cerrado: reábrelo para registrar resultados.</p>}

      <TestCaseCard tc={tc} stepControls={stepButtons} />

      <div className="form-box">
        <h4>Resultado de la ejecución</h4>
        <div className="status-picker">
          {(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const).map((s) => (
            <button key={s} disabled={closed || !!saved} className={`status-btn s-${s} ${status === s ? 'on' : ''}`} onClick={() => setManualStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {suggested && !manualStatus && <p className="muted">Estado sugerido según los pasos: {STATUS_LABEL[suggested]}</p>}
        <label><span>Resultado obtenido {status === 'FAILED' && <span className="req">*</span>}</span>
          <textarea rows={3} disabled={closed || !!saved} value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Qué ocurrió realmente" />
        </label>
        <div className="row">
          <label className="grow">Evidencia (enlace)<input disabled={closed || !!saved} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="URL de captura, video o log" /></label>
          <label>ID de defecto<input disabled={closed || !!saved} value={bugId} onChange={(e) => setBugId(e.target.value)} placeholder="ej. BUG-012 / JIRA-123" /></label>
        </div>
        <label>Comentario<textarea rows={2} disabled={closed || !!saved} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
        <p className="muted">No pegues datos reales sensibles ni credenciales en evidencia o comentarios.</p>

        <div className="row">
          {!saved && <button className="primary" disabled={closed} onClick={save}>Guardar resultado</button>}
          {saved?.status === 'FAILED' && <button onClick={copyBug}>Copiar borrador de defecto</button>}
          {saved && nextId && <button className="primary" onClick={() => onNext(nextId)}>Siguiente caso →</button>}
          {saved && !nextId && <button className="primary" onClick={onBack}>Volver al ciclo</button>}
        </div>
        {msg && <p className="notice">{msg}</p>}
      </div>

      <h4>Historial en este ciclo</h4>
      {history.length === 0 ? <p className="muted">Sin ejecuciones previas.</p> : (
        <table>
          <thead><tr><th>Ejecución</th><th>Fecha</th><th>Estado</th><th>Resultado obtenido</th><th>Defecto</th></tr></thead>
          <tbody>
            {history.map((e) => (
              <tr key={e.executionId}>
                <td><code>{e.executionId}</code></td>
                <td className="muted">{e.executedAt.replace('T', ' ').slice(0, 16)}</td>
                <td><span className={`status s-${e.status}`}>{STATUS_LABEL[e.status]}</span></td>
                <td>{e.actualResult}</td>
                <td>{e.bugId ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/* ---------- Barra de progreso apilada ---------- */

function Progress({ counts, total, big }: { counts: Record<ExecStatus, number>; total: number; big?: boolean }) {
  const order: ExecStatus[] = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN']
  return (
    <div className={`progress ${big ? 'big' : ''}`} role="img" aria-label={order.map((k) => `${STATUS_LABEL[k]}: ${counts[k]}`).join(', ')}>
      {total > 0 && order.map((k) => counts[k] > 0 && <span key={k} className={`seg s-${k}`} style={{ width: `${(counts[k] / total) * 100}%` }} />)}
    </div>
  )
}
