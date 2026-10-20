// Catálogo de agentes. El comportamiento vive en prompts/system-prompt.md;
// aquí solo se mapea cada agente a su sección y al tipo de artefacto que produce.

export type ArtifactType = 'requirement' | 'risk' | 'testcase' | 'run' | 'execution' | 'automation' | 'report' | 'plan'

export interface AgentDef {
  id: string
  label: string
  section: number          // número de § en system-prompt.md
  produces: ArtifactType
  idPrefix: string         // prefijo esperado en los IDs de sus artefactos
  needs: ArtifactType[]    // artefactos padres que deben ir en <context>
}

export const AGENTS: AgentDef[] = [
  { id: 'orchestrator', label: 'Orquestador', section: 1, produces: 'plan', idPrefix: '', needs: [] },
  { id: 'requirements-analyst', label: 'Análisis de requerimiento', section: 2, produces: 'requirement', idPrefix: 'REQ-', needs: [] },
  { id: 'risk-analyst', label: 'Riesgos', section: 3, produces: 'risk', idPrefix: 'RSK-', needs: ['requirement'] },
  { id: 'test-designer', label: 'Diseño de casos', section: 4, produces: 'testcase', idPrefix: 'TC-', needs: ['requirement', 'risk'] },
  { id: 'execution-tracker', label: 'Ejecución', section: 5, produces: 'execution', idPrefix: 'EXE-', needs: ['testcase'] },
  { id: 'automation-engineer', label: 'Automatización', section: 6, produces: 'automation', idPrefix: 'AUT-', needs: ['testcase'] },
  { id: 'reporter', label: 'Reporte', section: 7, produces: 'report', idPrefix: '', needs: ['requirement', 'risk', 'testcase', 'execution'] },
]

export const getAgent = (id: string): AgentDef => {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Agente desconocido: ${id}`)
  return agent
}
