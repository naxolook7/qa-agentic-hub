import { useEffect, useState } from 'react'
import { enabledModes } from './agents/composer'
import { HUB_NAME, VARS } from './config'
import type { StoredArtifact } from './store/model'
import { loadArtifacts, saveArtifacts } from './store/store'
import { ArtifactsPanel } from './ui/ArtifactsPanel'
import { BridgePanel } from './ui/BridgePanel'
import { DataPanel } from './ui/DataPanel'
import { ExecutionsPanel } from './ui/ExecutionsPanel'

type Tab = 'bridge' | 'artifacts' | 'executions' | 'data'

export default function App() {
  const [tab, setTab] = useState<Tab>('bridge')
  const [artifacts, setArtifacts] = useState<StoredArtifact[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadArtifacts(HUB_NAME).then(setArtifacts).catch((e) => setError(`No se pudo abrir IndexedDB: ${e.message}`))
  }, [])

  const save = async (next: StoredArtifact[]) => {
    await saveArtifacts(HUB_NAME, next)
    setArtifacts(next)
  }

  return (
    <div className="app">
      <header>
        <h1>QA Agentic Hub</h1>
        <span className="badge">Hub {HUB_NAME}</span>
        <span className="muted">Modos: {enabledModes(VARS).join(' · ')}</span>
      </header>
      <nav className="tabs">
        <button className={tab === 'bridge' ? 'active' : ''} onClick={() => setTab('bridge')}>Puente (Modo A)</button>
        <button className={tab === 'artifacts' ? 'active' : ''} onClick={() => setTab('artifacts')}>Artefactos ({artifacts.length})</button>
        <button className={tab === 'executions' ? 'active' : ''} onClick={() => setTab('executions')}>Ejecuciones</button>
        <button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>Perfil y datos</button>
      </nav>
      {error && <p className="result bad">{error}</p>}
      {tab === 'bridge' && <BridgePanel artifacts={artifacts} onSave={save} />}
      {tab === 'artifacts' && <ArtifactsPanel artifacts={artifacts} onSave={save} />}
      {tab === 'executions' && <ExecutionsPanel artifacts={artifacts} onSave={save} />}
      {tab === 'data' && <DataPanel artifacts={artifacts} onSave={save} />}
      <footer className="muted">Los datos viven solo en este navegador. Exporta un respaldo con frecuencia.</footer>
    </div>
  )
}
