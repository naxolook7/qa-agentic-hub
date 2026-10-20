import { useMemo, useState } from 'react'
import { AGENTS, getAgent } from '../agents/agents'
import { composeFollowUp, composePrompt } from '../agents/composer'
import { parseAgentResponse } from '../bridge/parseResponse'
import type { AgentResponse } from '../bridge/schemas'
import { SYSTEM_PROMPT, VARS } from '../config'
import { mergeArtifacts, relatedTo, reservedIds, type StoredArtifact } from '../store/model'

interface Props {
  artifacts: StoredArtifact[]
  onSave: (next: StoredArtifact[]) => Promise<void>
}

type Outcome =
  | { kind: 'error'; errors: string[] }
  | { kind: 'saved'; data: AgentResponse; artifactErrors: string[]; saved: number; conflicts: string[] }

export function BridgePanel({ artifacts, onSave }: Props) {
  const [agentId, setAgentId] = useState('requirements-analyst')
  const [reqId, setReqId] = useState('')
  const [input, setInput] = useState('')
  const [includeSystem, setIncludeSystem] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [notice, setNotice] = useState('')

  const agent = getAgent(agentId)
  const requirements = useMemo(() => artifacts.filter((a) => a.type === 'requirement'), [artifacts])
  const needsReq = agent.needs.includes('requirement')

  const copy = async (text: string, label: string) => {
    setPrompt(text)
    try {
      await navigator.clipboard.writeText(text)
      setNotice(`${label} copiado. Pégalo en tu Proyecto de Claude.`)
    } catch {
      setNotice('No se pudo acceder al portapapeles: copia el texto del recuadro manualmente.')
    }
  }

  const buildPrompt = () => {
    setOutcome(null)
    if (needsReq && !reqId) return setNotice('Selecciona el requerimiento de origen.')
    if (!input.trim() && !needsReq) return setNotice('Ingresa el requerimiento o la instrucción.')
    try {
      const context = {
        idsReservados: reservedIds(artifacts, reqId || undefined),
        ...(reqId ? relatedTo(artifacts, reqId, agent.needs) : {}),
      }
      const text = composePrompt({
        systemPrompt: SYSTEM_PROMPT,
        vars: VARS,
        agent,
        mode: 'A',
        input: input || `Procesa ${reqId} según tu rol.`,
        context,
        includeSystem,
      })
      void copy(text, 'Prompt')
    } catch (e) {
      setNotice((e as Error).message)
    }
  }

  const validateAndSave = async () => {
    const r = parseAgentResponse(response, agent)
    if (!r.ok) return setOutcome({ kind: 'error', errors: r.errors })
    const merged = mergeArtifacts(artifacts, agent.produces, r.data.artifacts as Record<string, unknown>[], {
      mode: 'A',
      agent: agent.id,
      date: new Date().toISOString(),
    })
    await onSave(merged.result)
    setAnswers({})
    setOutcome({
      kind: 'saved',
      data: r.data,
      artifactErrors: r.artifactErrors,
      saved: r.data.artifacts.length - merged.conflicts.length - merged.skipped,
      conflicts: merged.conflicts,
    })
  }

  const followUp = () => {
    if (outcome?.kind !== 'saved') return
    const qa = outcome.data.clarifications
      .map((c, i) => ({ question: c.question, answer: (answers[i] ?? '').trim() }))
      .filter((a) => a.answer)
    void copy(composeFollowUp(agent.id, qa, outcome.data.next), 'Prompt de seguimiento')
  }

  return (
    <section className="panel">
      <ol className="steps">
        <li>
          <h3>1 · Agente y entrada</h3>
          <div className="row">
            <label>
              Agente
              <select value={agentId} onChange={(e) => { setAgentId(e.target.value); setOutcome(null) }}>
                {AGENTS.filter((a) => a.id !== 'orchestrator').map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>
            {needsReq && (
              <label>
                Requerimiento
                <select value={reqId} onChange={(e) => setReqId(e.target.value)}>
                  <option value="">— seleccionar —</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>{r.id} · {String(r.data.title ?? '')}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <textarea
            rows={7}
            placeholder={needsReq ? 'Instrucciones adicionales (opcional)' : 'Pega aquí la HU, BRD, ticket o especificación…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <label className="check">
            <input type="checkbox" checked={includeSystem} onChange={(e) => setIncludeSystem(e.target.checked)} />
            Incluir system prompt (desmárcalo si tu Proyecto de Claude ya tiene <code>system-prompt.md</code> cargado)
          </label>
          <button className="primary" onClick={buildPrompt}>Copiar prompt</button>
          {notice && <p className="notice">{notice}</p>}
          {prompt && (
            <details>
              <summary>Ver prompt ({prompt.length.toLocaleString()} caracteres)</summary>
              <pre className="prompt">{prompt}</pre>
            </details>
          )}
        </li>

        <li>
          <h3>2 · Pegar respuesta de Claude</h3>
          <textarea rows={8} placeholder="Pega la respuesta completa (con o sin ```json)" value={response} onChange={(e) => setResponse(e.target.value)} />
          <button className="primary" onClick={validateAndSave} disabled={!response.trim()}>Validar y guardar</button>
        </li>
      </ol>

      {outcome?.kind === 'error' && (
        <div className="result bad">
          <strong>La respuesta no cumple el formato §9.</strong>
          <ul>{outcome.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          <p>Pide a Claude: “Corrige tu respuesta para que cumpla §9: {outcome.errors[0]}”.</p>
        </div>
      )}

      {outcome?.kind === 'saved' && (
        <div className={`result ${outcome.data.status === 'complete' ? 'good' : 'warn'}`}>
          <strong>
            Estado: {outcome.data.status} · {outcome.saved} artefacto(s) guardado(s)
          </strong>
          {outcome.conflicts.length > 0 && (
            <p>No se sobrescribieron artefactos aprobados: {outcome.conflicts.join(', ')}</p>
          )}
          {outcome.data.summary_md && <pre className="summary">{outcome.data.summary_md}</pre>}
          {outcome.artifactErrors.length > 0 && (
            <>
              <h4>Artefactos con campos incompletos (guardados, revisar)</h4>
              <ul>{outcome.artifactErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </>
          )}
          {outcome.data.warnings.length > 0 && (
            <>
              <h4>Warnings</h4>
              <ul>{outcome.data.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </>
          )}
          {outcome.data.assumptions.length > 0 && (
            <>
              <h4>Supuestos (requieren confirmación)</h4>
              <ul>{outcome.data.assumptions.map((a, i) => <li key={i}>{a.text}</li>)}</ul>
            </>
          )}
          {outcome.data.clarifications.length > 0 && (
            <>
              <h4>Clarifications</h4>
              {outcome.data.clarifications.map((c, i) => (
                <div className="clar" key={i}>
                  <p><strong>{c.question}</strong>{c.why ? ` — ${c.why}` : ''}</p>
                  <input
                    placeholder="Tu respuesta"
                    value={answers[i] ?? ''}
                    onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                  />
                </div>
              ))}
            </>
          )}
          {(outcome.data.clarifications.length > 0 || outcome.data.next) && (
            <button onClick={followUp}>
              {outcome.data.next ? 'Copiar prompt de continuación' : 'Copiar prompt de seguimiento'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
