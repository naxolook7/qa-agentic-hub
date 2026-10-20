# CLAUDE.md — QA Agentic Hub (Hub Personal)

Contexto para Claude Code. Léelo completo antes de cualquier tarea.

## Qué es este repo
SPA estática (Vite + React + TypeScript) publicada en GitHub Pages que gestiona el ciclo
**requerimiento → riesgos → casos → ejecución → automatización**. No llama a ninguna API de IA pagada:
los agentes corren en un Proyecto de Claude (Modo A), en Claude Code (Modo B) o en servicios gratuitos (Modo C).

## Fuentes de verdad
- `roadmap.md` — backlog por fases con DoD. **Trabaja solo en la fase actual.**
- `prompts/system-prompt.md` — comportamiento de los agentes. No dupliques reglas en el código.
- `profile.yaml` — variables `{{...}}` de este Hub (§10 del system prompt).
- `schemas/*.schema.json` — contrato de artefactos para Modo B. Los esquemas Zod del front están en `src/bridge/schemas.ts`; mantenlos alineados.

## Estructura
```
src/agents/    catálogo de agentes + composer de prompts
src/bridge/    extracción/validación de respuestas (Zod)
src/store/     modelo de datos e IndexedDB (separado por Hub)
src/execution/ ciclos de prueba, resultados, veredicto GO/CAUTION/NO-GO (sin IA)
src/ui/        paneles React
data/          artefactos JSON para Modo B (un archivo por artefacto)
templates/     estructuras base de automatización
.claude/commands/  comandos /qa-* (Modo B)
```

## Reglas de trabajo
1. Antes de codificar, indica qué issue/checkbox del roadmap estás resolviendo y su DoD.
2. Toda lógica nueva en `src/agents`, `src/bridge`, `src/store` o `src/execution` lleva prueba en Vitest.
3. Antes de terminar: `npm test && npm run build && npm run lint` sin errores.
4. Nunca agregues datos, nombres ni dominios de ninguna empresa. Este Hub es personal.
5. Nunca commitees secretos (API keys, PATs). Las keys de proveedores gratuitos se guardan solo en el navegador del usuario.
6. Commits en español, convencionales: `feat(bridge): …`, `fix(store): …`, `test(composer): …`.

## Comandos
```bash
npm run dev      # desarrollo local
npm test         # Vitest
npm run build    # type-check + build
npm run lint     # oxlint
```

## Modo B (agentes sobre `data/`)
Los comandos `/qa-analyze`, `/qa-risks`, `/qa-design`, `/qa-automate` y `/qa-report` aplican
`prompts/system-prompt.md` §11 (Modo B). Cada artefacto se guarda como `data/<tipo>/<ID>.json`
y debe validar contra `schemas/`.
