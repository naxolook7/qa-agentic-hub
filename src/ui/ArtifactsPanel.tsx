import { Fragment, useState } from 'react'
import type { ArtifactType } from '../agents/agents'
import type { StoredArtifact } from '../store/model'
import { TestCaseCard } from './TestCaseCard'

const TYPES: { type: ArtifactType; label: string }[] = [
  { type: 'requirement', label: 'Requerimientos' },
  { type: 'risk', label: 'Riesgos' },
  { type: 'testcase', label: 'Casos de prueba' },
  { type: 'run', label: 'Ciclos' },
  { type: 'execution', label: 'Ejecuciones' },
  { type: 'automation', label: 'Automatización' },
]

const titleOf = (a: StoredArtifact) =>
  String(a.data.title ?? a.data.name ?? a.data.description ?? a.data.path ?? (a.data.testCaseId ? `${a.data.testCaseId} · ${a.data.status}` : ''))

interface Props {
  artifacts: StoredArtifact[]
  onSave: (next: StoredArtifact[]) => Promise<void>
}

export function ArtifactsPanel({ artifacts, onSave }: Props) {
  const [type, setType] = useState<ArtifactType>('requirement')
  const [open, setOpen] = useState<string | null>(null)
  const list = artifacts.filter((a) => a.type === type).sort((a, b) => a.id.localeCompare(b.id))

  const toggleApproval = async (id: string) => {
    const approver = 'QA'
    await onSave(artifacts.map((a) => (a.id === id ? { ...a, approvedBy: a.approvedBy ? null : approver } : a)))
  }

  return (
    <section className="panel">
      <div className="tabs small">
        {TYPES.map((t) => (
          <button key={t.type} className={t.type === type ? 'active' : ''} onClick={() => setType(t.type)}>
            {t.label} ({artifacts.filter((a) => a.type === t.type).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="muted">Aún no hay artefactos de este tipo. Genéralos desde el Puente.</p>
      ) : (
        <table>
          <thead>
            <tr><th>ID</th><th>Título</th><th>v</th><th>Origen</th><th>Aprobado</th><th /></tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <Fragment key={a.id}>
                <tr>
                  <td><code>{a.id}</code></td>
                  <td>{titleOf(a)}</td>
                  <td>{a.version}</td>
                  <td>Modo {a.source.mode} · {new Date(a.source.date).toLocaleString()}</td>
                  <td>
                    <button className="link" onClick={() => toggleApproval(a.id)}>
                      {a.approvedBy ? '✔ aprobado' : 'aprobar'}
                    </button>
                  </td>
                  <td><button className="link" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'ocultar' : a.type === 'testcase' ? 'ver detalle' : 'ver JSON'}</button></td>
                </tr>
                {open === a.id && (
                  <tr>
                    <td colSpan={6}>
                      {a.type === 'testcase' ? (
                        <>
                          <TestCaseCard tc={a.data} />
                          <details><summary>Ver JSON</summary><pre className="prompt">{JSON.stringify(a.data, null, 2)}</pre></details>
                        </>
                      ) : (
                        <pre className="prompt">{JSON.stringify(a.data, null, 2)}</pre>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
