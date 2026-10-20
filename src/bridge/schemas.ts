import { z } from 'zod'

// Validación de la respuesta de los agentes (§9) y de los artefactos clave.
// Los esquemas son "looseObject": exigen lo mínimo para la trazabilidad y conservan campos extra.

export const Clarification = z.looseObject({
  question: z.string().min(1),
  why: z.string().optional(),
  blocks: z.array(z.string()).optional(),
})

export const AgentResponse = z.looseObject({
  agent: z.string().min(1),
  status: z.enum(['complete', 'partial', 'blocked']),
  artifacts: z.array(z.looseObject({ id: z.string().optional() })).default([]),
  coverage: z.unknown().optional(),
  assumptions: z.array(z.looseObject({ text: z.string() })).default([]),
  clarifications: z.array(Clarification).default([]),
  warnings: z.array(z.string()).default([]),
  summary_md: z.string().default(''),
  next: z.string().optional(),
})
export type AgentResponse = z.infer<typeof AgentResponse>

const score = z.number().int().min(1).max(5).nullable()

export const ArtifactSchemas = {
  requirement: z.looseObject({
    id: z.string().regex(/^REQ-\d{3,}$/),
    title: z.string().min(1),
    acceptanceCriteria: z.array(z.looseObject({ id: z.string(), text: z.string() })).default([]),
  }),
  risk: z.looseObject({
    id: z.string().regex(/^RSK-\d{3,}-\d{2,}$/),
    description: z.string().min(1),
    probability: score,
    impact: score,
  }),
  testcase: z.looseObject({
    id: z.string().regex(/^TC-\d{3,}-\d{3,}$/),
    requirementId: z.string().regex(/^REQ-\d{3,}$/),
    title: z.string().min(1),
    steps: z.array(z.unknown()).min(1),
    expectedResult: z.unknown(),
    automation: z.enum(['CANDIDATE', 'MANUAL', 'DEFERRED']),
  }),
  execution: z.looseObject({
    executionId: z.string().regex(/^EXE-\d{8}-\d{3,}$/),
    testCaseId: z.string().regex(/^TC-/),
    status: z.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN']),
  }),
  automation: z.looseObject({
    path: z.string().min(1),
    content: z.string(),
    coversTestCases: z.array(z.string()).min(1),
  }),
} as const
