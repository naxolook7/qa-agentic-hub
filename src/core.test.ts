import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAgent } from './agents/agents'
import { composeFollowUp, composePrompt, resolveVars, splitSections } from './agents/composer'
import { extractJson, parseAgentResponse } from './bridge/parseResponse'
import { mergeArtifacts, relatedTo, reservedIds, type StoredArtifact } from './store/model'

const SYSTEM_PROMPT = readFileSync(new URL('../prompts/system-prompt.md', import.meta.url), 'utf8')
const VARS = { ORG_DESCRIPTION: 'Org de prueba', ALLOWED_ENVIRONMENTS: 'dev, stage', FORBIDDEN_ENVIRONMENTS: 'prod', ENABLED_MODES: 'A, B', MAX_ITEMS: '5' }
const src = { mode: 'A' as const, agent: 'test', date: '2026-10-20T00:00:00Z' }

describe('system-prompt.md', () => {
  it('contiene las secciones §0 a §11 que usa el composer', () => {
    const s = splitSections(SYSTEM_PROMPT)
    for (let n = 0; n <= 11; n++) expect(s.has(n), `falta §${n}`).toBe(true)
  })
})

describe('composer', () => {
  it('resuelve solo variables del perfil y conserva placeholders de datos', () => {
    expect(resolveVars('{{ORG_DESCRIPTION}} usa {{API_KEY}}', VARS)).toBe('Org de prueba usa {{API_KEY}}')
  })

  it('arma un prompt autocontenido con §0 + agente + §9 + §11 y el encabezado AGENTE', () => {
    const p = composePrompt({ systemPrompt: SYSTEM_PROMPT, vars: VARS, agent: getAgent('risk-analyst'), mode: 'A', input: 'x', includeSystem: true })
    expect(p).toContain('## §0')
    expect(p).toContain('## §3')
    expect(p).toContain('## §9')
    expect(p).toContain('## §11')
    expect(p).not.toContain('## §4')
    expect(p).toContain('AGENTE: risk-analyst')
    expect(p).toContain('Nunca para `prod`')
  })

  it('sin system prompt envía solo el mensaje', () => {
    const p = composePrompt({ systemPrompt: SYSTEM_PROMPT, vars: VARS, agent: getAgent('requirements-analyst'), mode: 'A', input: 'HU', includeSystem: false })
    expect(p.startsWith('AGENTE: requirements-analyst')).toBe(true)
  })

  it('bloquea un modo no habilitado en el Hub (ej. C3 en Hub Empresa)', () => {
    expect(() => composePrompt({ systemPrompt: SYSTEM_PROMPT, vars: VARS, agent: getAgent('reporter'), mode: 'C3', input: 'x', includeSystem: false }))
      .toThrow(/no está habilitado/)
  })

  it('el seguimiento incluye respuestas y la continuación', () => {
    const p = composeFollowUp('test-designer', [{ question: '¿Monto máximo?', answer: '1000' }], 'casos del AC3')
    expect(p).toContain('R: 1000')
    expect(p).toContain('casos del AC3')
  })

  it('el cierre con dudas pendientes pide no generar más clarifications', () => {
    const p = composeFollowUp('requirements-analyst', [], undefined, true)
    expect(p).toContain('No generes nuevas clarifications')
    expect(p).toContain('PENDIENTE:')
    expect(composeFollowUp('requirements-analyst', [])).not.toContain('CIERRE')
  })
})

describe('parser de respuestas', () => {
  const agent = getAgent('requirements-analyst')
  const valid = {
    agent: 'requirements-analyst', status: 'partial',
    artifacts: [{ id: 'REQ-001', title: 'Pago', acceptanceCriteria: [{ id: 'REQ-001-AC1', text: 'Dado…' }] }],
    clarifications: [{ question: '¿Moneda?' }], summary_md: 'ok',
  }

  it('extrae JSON desde bloque ```json con texto alrededor', () => {
    expect(extractJson('Aquí va:\n```json\n{"a":1}\n```\nlisto')).toBe('{"a":1}')
  })

  it('acepta una respuesta válida', () => {
    const r = parseAgentResponse('```json\n' + JSON.stringify(valid) + '\n```', agent)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.artifactErrors).toEqual([])
  })

  it('rechaza JSON inválido, agente equivocado y blocked sin clarifications', () => {
    expect(parseAgentResponse('{ no json', agent).ok).toBe(false)
    expect(parseAgentResponse(JSON.stringify({ ...valid, agent: 'reporter' }), agent).ok).toBe(false)
    expect(parseAgentResponse(JSON.stringify({ ...valid, status: 'blocked', clarifications: [] }), agent).ok).toBe(false)
  })

  it('reporta artefactos con ID fuera de convención sin descartar la respuesta', () => {
    const r = parseAgentResponse(JSON.stringify({ ...valid, artifacts: [{ id: 'REQ1', title: 'x' }] }), agent)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.artifactErrors.some((e) => e.includes('REQ1'))).toBe(true)
  })

  it('valida veredicto de automatización en casos de prueba', () => {
    const tc = { id: 'TC-001-001', requirementId: 'REQ-001', title: 't', steps: ['a'], expectedResult: 'b', automation: 'MAYBE' }
    const r = parseAgentResponse(JSON.stringify({ agent: 'test-designer', status: 'complete', artifacts: [tc] }), getAgent('test-designer'))
    expect(r.ok && r.artifactErrors.length).toBeGreaterThan(0)
  })
})

describe('modelo de datos', () => {
  const base: StoredArtifact[] = [
    { id: 'REQ-001', type: 'requirement', version: 1, data: { id: 'REQ-001' }, source: src, approvedBy: null },
    { id: 'RSK-001-01', type: 'risk', version: 1, data: { id: 'RSK-001-01' }, source: src, approvedBy: 'QA' },
    { id: 'TC-001-002', type: 'testcase', version: 1, data: { id: 'TC-001-002' }, source: src, approvedBy: null },
  ]

  it('reserva los siguientes IDs libres', () => {
    expect(reservedIds(base, 'REQ-001')).toEqual({ nextRequirementId: 'REQ-002', nextRiskId: 'RSK-001-02', nextTestCaseId: 'TC-001-003' })
  })

  it('versiona artefactos y no sobrescribe los aprobados', () => {
    const r = mergeArtifacts(base, 'risk', [{ id: 'RSK-001-01' }, { id: 'RSK-001-02' }, { foo: 1 }], src)
    expect(r.conflicts).toEqual(['RSK-001-01'])
    expect(r.skipped).toBe(1)
    expect(r.result.find((a) => a.id === 'RSK-001-02')?.version).toBe(1)
  })

  it('arma el contexto solo con artefactos del requerimiento', () => {
    const ctx = relatedTo([...base, { ...base[2], id: 'TC-002-001', data: {} }], 'REQ-001', ['testcase'])
    expect(ctx.testcase).toHaveLength(1)
  })
})
