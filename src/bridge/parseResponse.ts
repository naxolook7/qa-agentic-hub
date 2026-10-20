import type { AgentDef } from '../agents/agents'
import { AgentResponse, ArtifactSchemas } from './schemas'

export type ParseResult =
  | { ok: true; data: AgentResponse; artifactErrors: string[] }
  | { ok: false; errors: string[] }

/** Extrae el JSON de una respuesta pegada: bloque ```json, bloque ``` genérico o el primer {...} balanceado. */
export function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : null
}

export function parseAgentResponse(raw: string, agent: AgentDef): ParseResult {
  const json = extractJson(raw)
  if (!json) return { ok: false, errors: ['No se encontró un bloque JSON en la respuesta.'] }

  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (e) {
    return { ok: false, errors: [`JSON inválido: ${(e as Error).message}`] }
  }

  const env = AgentResponse.safeParse(value)
  if (!env.success) {
    return { ok: false, errors: env.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`) }
  }
  if (env.data.agent !== agent.id) {
    return { ok: false, errors: [`La respuesta es del agente "${env.data.agent}", pero se esperaba "${agent.id}".`] }
  }
  if (env.data.status === 'blocked' && env.data.clarifications.length === 0) {
    return { ok: false, errors: ['status "blocked" sin clarifications: el agente debe indicar qué falta.'] }
  }

  // Validación por artefacto: los inválidos no bloquean el resto, se reportan.
  const schema = (ArtifactSchemas as Record<string, (typeof ArtifactSchemas)[keyof typeof ArtifactSchemas]>)[agent.produces]
  const artifactErrors: string[] = []
  if (schema) {
    env.data.artifacts.forEach((a, idx) => {
      const r = schema.safeParse(a)
      if (!r.success) {
        const label = (a as { id?: string }).id ?? `#${idx + 1}`
        artifactErrors.push(...r.error.issues.map((i) => `${label} → ${i.path.join('.')}: ${i.message}`))
      }
    })
  }
  return { ok: true, data: env.data, artifactErrors }
}
