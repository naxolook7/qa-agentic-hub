import { createStore, get, set } from 'idb-keyval'
import type { HubSnapshot, StoredArtifact } from './model'

// Persistencia local (IndexedDB), separada por Hub. Nada sale del navegador
// salvo que el usuario exporte o (Fase 5) sincronice con su repo de datos.
const db = createStore('qa-agentic-hub', 'artifacts')
const key = (hub: string) => `${hub}:artifacts`

export async function loadArtifacts(hub: string): Promise<StoredArtifact[]> {
  return (await get<StoredArtifact[]>(key(hub), db)) ?? []
}

export async function saveArtifacts(hub: string, artifacts: StoredArtifact[]): Promise<void> {
  await set(key(hub), artifacts, db)
}

export function toSnapshot(hub: string, artifacts: StoredArtifact[]): HubSnapshot {
  return { hub, exportedAt: new Date().toISOString(), artifacts }
}

export function fromSnapshot(hub: string, text: string): StoredArtifact[] {
  const snap = JSON.parse(text) as HubSnapshot
  if (!Array.isArray(snap.artifacts)) throw new Error('Archivo inválido: falta "artifacts".')
  if (snap.hub && snap.hub !== hub) {
    throw new Error(`Este respaldo es del Hub "${snap.hub}" y estás en "${hub}". Los Hubs no se mezclan.`)
  }
  return snap.artifacts
}
