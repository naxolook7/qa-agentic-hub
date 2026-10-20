# QA Agentic Hub — Hub Personal

Gestiona en un solo lugar **requerimiento → riesgos → casos → ejecución → automatización**, con agentes de IA
**sin costo de API**: los prompts se ejecutan en tu Proyecto de Claude (Modo A) o con Claude Code (Modo B).

> Estado: **Fase 1 completa + ejecuciones (Fase 4)**. Ver `roadmap.md`.

## Qué incluye este scaffold

| Pieza | Ubicación |
|---|---|
| Front (Vite + React + TS) con Puente copiar/pegar, validación Zod e IndexedDB | `src/` |
| Comportamiento de agentes | `prompts/system-prompt.md` |
| Variables de este Hub | `profile.yaml` |
| Contratos de artefactos | `schemas/*.schema.json` |
| Comandos de Claude Code (Modo B) | `.claude/commands/qa-*.md` + `CLAUDE.md` |
| Instrucciones para Copilot | `.github/copilot-instructions.md`, `.github/prompts/` |
| Deploy a GitHub Pages | `.github/workflows/deploy-pages.yml` |
| Decisiones | `docs/adr/` |
| Pruebas unitarias del núcleo | `src/core.test.ts` |

## 1. Correr en local

```bash
npm install
npm test        # pruebas del composer, parser, modelo y ejecuciones
npm run dev     # http://localhost:5173
```

## 2. Publicar en GitHub Pages

```bash
git init -b main && git add . && git commit -m "feat: scaffold inicial QA Agentic Hub"
gh repo create qa-agentic-hub --public --source=. --push
```

En GitHub → **Settings → Pages → Source: GitHub Actions**. Cada push a `main` corre tests, build y deploy.
El sitio queda en `https://<tu-usuario>.github.io/qa-agentic-hub/`.

### ⚠️ Repo público y la carpeta `data/`
Con GitHub Free, Pages solo publica desde repos **públicos**. El front no contiene datos (viven en IndexedDB
de tu navegador), pero lo que commitees en `data/` **sí sería público**. Opciones:
- Hub Personal con datos ficticios → puedes dejar `data/` en este repo.
- Datos que no quieres exponer → crea un repo privado `qa-hub-data`, regístralo en `profile.yaml` (`hub.dataRepo`)
  y usa Modo B dentro de ese repo (copia allí `CLAUDE.md`, `.claude/commands/`, `prompts/` y `schemas/`).

## 3. Configurar el Proyecto de Claude (Modo A)

1. En claude.ai crea un Proyecto: **QA Agentic Hub – Personal**.
2. Sube `prompts/system-prompt.md` y `profile.yaml` como conocimiento.
3. En el Hub, desmarca **“Incluir system prompt”** (el Proyecto ya lo tiene) — o déjalo marcado si pegas en un chat normal.

Flujo: **Puente → elige agente → pega la HU → Copiar prompt → pégalo en el Proyecto → copia la respuesta →
Pegar respuesta → Validar y guardar**. Si hay `clarifications`, respóndelas en el Hub y copia el prompt de seguimiento.

## 4. Ejecutar pruebas (estilo TestRail)

1. Pestaña **Ejecuciones → + Nuevo ciclo**: elige el requerimiento, ambiente, build y casos → **Crear ciclo**.
2. **▶ Ejecutar siguiente pendiente**: marca cada paso (✓ ✗ ⛔), elige el estado y completa resultado obtenido y evidencia → **Guardar resultado**.
3. Si falló: **Copiar borrador de defecto** y pégalo en Jira/Notion.
4. Para un re-test, abre el caso desde la tabla del ciclo y registra una nueva ejecución (el historial se conserva).
5. **Copiar reporte** entrega el resumen con la recomendación GO / CAUTION / NO-GO:
   - **NO-GO**: algún P1/P2 fallido, o algún P1 sin ejecutar o bloqueado.
   - **CAUTION**: fallas P3/P4, bloqueos, P1/P2 omitidos o casos pendientes.
   - **GO**: todo ejecutado sin fallas ni bloqueos.

## 5. Modo B con Claude Code

```bash
claude                    # login con tu Claude Pro
/qa-analyze docs/hu-ejemplo.md
/qa-risks REQ-001
/qa-design REQ-001
/qa-automate TC-001-003 playwright
```

## 6. Para crear el Hub Empresa (más adelante)

Copia este repo **una sola vez** a la org de la empresa, sin `data/` y sin código de Modo C, y ajusta `profile.yaml`
(`hub.name: Empresa`, contexto, marcos regulatorios, ambientes, repos reales y `ENABLED_MODES: "A, B"`).
Desde ahí evoluciona por separado. El respaldo JSON de un Hub no se puede importar en el otro.
