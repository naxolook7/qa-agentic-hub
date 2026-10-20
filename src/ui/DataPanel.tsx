import { useState } from 'react'
import { DATA_REPO, HUB_NAME, VARS } from '../config'
import type { StoredArtifact } from '../store/model'
import { fromSnapshot, toSnapshot } from '../store/store'

interface Props {
  artifacts: StoredArtifact[]
  onSave: (next: StoredArtifact[]) => Promise<void>
}

export function DataPanel({ artifacts, onSave }: Props) {
  const [msg, setMsg] = useState('')

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toSnapshot(HUB_NAME, artifacts), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qa-hub-${HUB_NAME.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const imported = fromSnapshot(HUB_NAME, await file.text())
      if (!confirm(`Se reemplazarán ${artifacts.length} artefactos por ${imported.length} del respaldo. ¿Continuar?`)) return
      await onSave(imported)
      setMsg(`Importados ${imported.length} artefactos.`)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const clearAll = async () => {
    if (!confirm('¿Borrar todos los artefactos de este Hub en este navegador? Exporta antes si los necesitas.')) return
    await onSave([])
    setMsg('Datos locales borrados.')
  }

  return (
    <section className="panel">
      <h3>Perfil de este Hub</h3>
      <table className="kv">
        <tbody>
          <tr><th>Hub</th><td>{HUB_NAME}</td></tr>
          <tr><th>Repo de datos</th><td>{DATA_REPO || 'no configurado (solo navegador)'}</td></tr>
          {Object.entries(VARS).map(([k, v]) => (
            <tr key={k}><th>{k}</th><td>{v || <span className="muted">(vacío)</span>}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Se edita en <code>profile.yaml</code> del repositorio y se publica con el siguiente deploy.</p>

      <h3>Respaldo</h3>
      <div className="row">
        <button onClick={exportJson}>Exportar JSON</button>
        <label className="button">
          Importar JSON
          <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
        <button className="danger" onClick={clearAll}>Borrar datos locales</button>
      </div>
      {msg && <p className="notice">{msg}</p>}
    </section>
  )
}
