import type { ReactNode } from 'react'
import { normalizeList, normalizeSteps } from '../execution/runs'

const text = (v: unknown) => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2))

interface Props {
  tc: Record<string, unknown>
  /** Controles por paso (se usa al ejecutar). */
  stepControls?: (index: number) => ReactNode
}

/** Ficha legible de un caso de prueba (reemplaza leer el JSON). */
export function TestCaseCard({ tc, stepControls }: Props) {
  const steps = normalizeSteps(tc.steps)
  const pre = normalizeList(tc.preconditions)
  const acs = normalizeList(tc.acceptanceCriteria)
  const risks = normalizeList(tc.riskIds)
  const tags = normalizeList(tc.tags)
  const data = tc.testData

  return (
    <article className="card">
      <header className="card-head">
        <code>{text(tc.id)}</code>
        <h4>{text(tc.title)}</h4>
      </header>
      <div className="chips">
        {tc.priority != null && <span className={`chip prio-${text(tc.priority)}`}>{text(tc.priority)}</span>}
        {tc.type != null && <span className="chip">{text(tc.type)}</span>}
        {tc.level != null && <span className="chip">{text(tc.level)}</span>}
        {tc.automation != null && <span className={`chip auto-${text(tc.automation)}`}>{text(tc.automation)}</span>}
        {tags.map((t) => <span key={t} className="chip ghost">{t}</span>)}
      </div>

      {(acs.length > 0 || risks.length > 0) && (
        <p className="muted">
          {acs.length > 0 && <>Cubre: {acs.join(', ')}</>}
          {acs.length > 0 && risks.length > 0 && ' · '}
          {risks.length > 0 && <>Riesgos: {risks.join(', ')}</>}
        </p>
      )}

      {pre.length > 0 && (
        <>
          <h5>Precondiciones</h5>
          <ul>{pre.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </>
      )}

      {data != null && data !== '' && (
        <>
          <h5>Datos de prueba</h5>
          <pre className="data">{text(data)}</pre>
        </>
      )}

      <h5>Pasos</h5>
      {steps.length === 0 ? (
        <p className="muted">El caso no tiene pasos definidos.</p>
      ) : (
        <table className="steps-table">
          <thead>
            <tr><th>#</th><th>Acción</th><th>Resultado esperado</th>{stepControls && <th>Resultado</th>}</tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{s.action}</td>
                <td>{s.expected || <span className="muted">—</span>}</td>
                {stepControls && <td className="nowrap">{stepControls(i)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h5>Resultado esperado del caso</h5>
      <p>{text(tc.expectedResult) || <span className="muted">No definido</span>}</p>

      {tc.automationReason != null && (
        <p className="muted">Automatización: {text(tc.automationReason)}</p>
      )}
    </article>
  )
}
