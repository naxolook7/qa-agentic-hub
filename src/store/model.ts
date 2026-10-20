import type { ArtifactType } from '../agents/agents'
import type { Mode } from '../agents/composer'

export interface StoredArtifact {
  id: string
  type: ArtifactType
  version: number
  data: Record<string, unknown>
  source: { mode: Mode | 'manual'; agent: string; date: string }
  approvedBy: string | null
}

export interface HubSnapshot {
  hub: string
  exportedAt: string
  artifacts: StoredArtifact[]
}

const idOf = (type: ArtifactType, data: Record<string, unknown>): string | null => {
  const v = type === 'execution' ? data.executionId : type === 'automation' ? data.id ?? data.path : data.id
  return typeof v === 'string' && v.length ? v : null
}

/** Inserta o versiona artefactos. Un artefacto aprobado no se sobrescribe: se devuelve como conflicto. */
export function mergeArtifacts(
  existing: StoredArtifact[],
  type: ArtifactType,
  incoming: Record<string, unknown>[],
  source: StoredArtifact['source'],
): { result: StoredArtifact[]; conflicts: string[]; skipped: number } {
  const byId = new Map(existing.map((a) => [a.id, a]))
  const conflicts: string[] = []
  let skipped = 0
  for (const data of incoming) {
    const id = idOf(type, data)
    if (!id) { skipped++; continue }
    const prev = byId.get(id)
    if (prev?.approvedBy) { conflicts.push(id); continue }
    byId.set(id, { id, type, version: (prev?.version ?? 0) + 1, data, source, approvedBy: null })
  }
  return { result: [...byId.values()], conflicts, skipped }
}

/** Siguiente número libre para un prefijo (el front asigna IDs, §0.3). */
export function nextNumber(artifacts: StoredArtifact[], pattern: RegExp): number {
  let max = 0
  for (const a of artifacts) {
    const m = a.id.match(pattern)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

export const pad = (n: number, width: number) => String(n).padStart(width, '0')

export function reservedIds(artifacts: StoredArtifact[], requirementId?: string): Record<string, string> {
  const ids: Record<string, string> = {
    nextRequirementId: `REQ-${pad(nextNumber(artifacts, /^REQ-(\d+)$/), 3)}`,
  }
  if (requirementId) {
    const num = requirementId.replace('REQ-', '')
    ids.nextRiskId = `RSK-${num}-${pad(nextNumber(artifacts, new RegExp(`^RSK-${num}-(\\d+)$`)), 2)}`
    ids.nextTestCaseId = `TC-${num}-${pad(nextNumber(artifacts, new RegExp(`^TC-${num}-(\\d+)$`)), 3)}`
  }
  return ids
}

/** Artefactos relacionados a un requerimiento, por tipo, para armar <context>. */
export function relatedTo(artifacts: StoredArtifact[], requirementId: string, types: ArtifactType[]) {
  const num = requirementId.replace('REQ-', '')
  const belongs = (a: StoredArtifact) =>
    a.id === requirementId ||
    a.id.startsWith(`RSK-${num}-`) ||
    a.id.startsWith(`TC-${num}-`) ||
    (a.type === 'execution' && String(a.data.testCaseId ?? '').startsWith(`TC-${num}-`)) ||
    (a.type === 'run' && a.data.requirementId === requirementId)
  return Object.fromEntries(
    types.map((t) => [t, artifacts.filter((a) => a.type === t && belongs(a)).map((a) => a.data)]),
  )
}
