# Plantillas de automatización

Estructuras base que usa el agente `automation-engineer` (§6 de `prompts/system-prompt.md`)
**solo cuando el repo destino está vacío**. Si el repo ya tiene su propia estructura, se respeta la del repo.

| Carpeta | Framework | Estado |
|---|---|---|
| `playwright/` | Playwright + TypeScript (capas KATA) | Fase 5 — por completar |
| `karate/` | Karate (Java 17, `io.karatelabs`) | Fase 5 — por completar |
| `postman/` | Postman v2.1 + Newman | Fase 5 — por completar |

Cada plantilla debe incluir un ejemplo mínimo que corra en local y un workflow de CI.
