import type { AgentDef } from './agents'

export type Vars = Record<string, string>
export type Mode = 'A' | 'B' | 'C1' | 'C2' | 'C3'

/** Divide system-prompt.md en secciones por encabezado "## §N". */
export function splitSections(md: string): Map<number, string> {
  const sections = new Map<number, string>()
  const re = /^## §(\d+)\b/gm
  const marks: { n: number; start: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null) marks.push({ n: Number(m[1]), start: m.index })
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : md.length
    sections.set(mark.n, md.slice(mark.start, end).replace(/\n-{3,}\s*$/, '').trim())
  })
  return sections
}

/** Reemplaza solo las variables definidas en el perfil; deja intactos placeholders como {{API_KEY}}. */
export function resolveVars(text: string, vars: Vars): string {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (full, key: string) => (key in vars ? vars[key] : full))
}

export function enabledModes(vars: Vars): Mode[] {
  return (vars.ENABLED_MODES ?? 'A').split(',').map((s) => s.trim()).filter(Boolean) as Mode[]
}

export interface ComposeInput {
  systemPrompt: string
  vars: Vars
  agent: AgentDef
  mode: Mode
  input: string
  context?: Record<string, unknown>
  /** true: prompt autocontenido (sirve en cualquier chat). false: solo el mensaje (Proyecto de Claude con el system prompt cargado). */
  includeSystem: boolean
}

export function composePrompt(p: ComposeInput): string {
  if (!enabledModes(p.vars).includes(p.mode)) {
    throw new Error(`El modo ${p.mode} no está habilitado en este Hub (ENABLED_MODES=${p.vars.ENABLED_MODES ?? ''}).`)
  }
  const parts: string[] = []
  if (p.includeSystem) {
    const s = splitSections(p.systemPrompt)
    const wanted = [0, p.agent.section, 9, 11]
    const missing = wanted.filter((n) => !s.has(n))
    if (missing.length) throw new Error(`Faltan secciones en system-prompt.md: ${missing.map((n) => '§' + n).join(', ')}`)
    parts.push('=== INSTRUCCIONES DEL SISTEMA (QA Agentic Hub) ===')
    parts.push(...wanted.map((n) => resolveVars(s.get(n)!, p.vars)))
    parts.push('=== FIN DE INSTRUCCIONES ===')
  }
  const context = { profile: pickProfileVars(p.vars), ...(p.context ?? {}) }
  parts.push(
    [
      `AGENTE: ${p.agent.id}`,
      `MODO: ${p.mode}`,
      '<context>',
      JSON.stringify(context, null, 2),
      '</context>',
      '',
      'ENTRADA:',
      p.input.trim(),
      '',
      'Responde solo con el JSON de §9 dentro de un bloque ```json.',
    ].join('\n'),
  )
  return parts.join('\n\n')
}

/** Prompt de seguimiento cuando el usuario responde clarifications o pide continuar (`next`). */
export function composeFollowUp(agentId: string, answers: { question: string; answer: string }[], next?: string): string {
  const lines = [`AGENTE: ${agentId}`, 'MODO: A', '']
  if (answers.length) {
    lines.push('RESPUESTAS A CLARIFICATIONS:')
    answers.forEach((a, i) => lines.push(`${i + 1}. P: ${a.question}\n   R: ${a.answer}`))
    lines.push('')
  }
  if (next) lines.push(`CONTINÚA con lo pendiente: ${next}`, '')
  lines.push('Regenera la salida completa considerando lo anterior. Responde solo con el JSON de §9 dentro de un bloque ```json.')
  return lines.join('\n')
}

const PROFILE_KEYS = ['ALLOWED_ENVIRONMENTS', 'FORBIDDEN_ENVIRONMENTS', 'COMPLIANCE_FRAMEWORKS', 'REPO_CONVENTIONS', 'MAX_ITEMS']
function pickProfileVars(vars: Vars): Vars {
  return Object.fromEntries(PROFILE_KEYS.filter((k) => vars[k]).map((k) => [k, vars[k]]))
}
