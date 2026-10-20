# Roadmap — QA Agentic Hub

> Plataforma web estática (GitHub Pages) para gestionar en un solo lugar **requerimiento → riesgos → casos → ejecución → automatización**, asistida por agentes de IA **sin costo adicional por uso de API**.

---

## 1. Visión y alcance

**Objetivo:** que un QA ingrese un requerimiento y obtenga, con trazabilidad completa, el análisis, los riesgos priorizados, los casos de prueba, el registro de ejecuciones y los scripts automatizados (Playwright, Karate o Postman) siguiendo las estructuras de `system-prompt.md`.

**Principio económico:** **$0 adicional.** Se usan solo las suscripciones que ya existen (Claude Enterprise de la empresa, Claude Pro personal, GitHub) y servicios con capa gratuita. **No se usa la API pagada de Claude.**

**Dos Hubs independientes**

| | Hub Personal | Hub Empresa |
|---|---|---|
| Repo | GitHub personal | GitHub de la empresa (org) |
| Licencia Claude | Claude Pro (personal) | Claude Enterprise |
| Modos de agente habilitados | **A, B, C1, C2, C3** (Claude Pro + gratuitos) | **A, B** (solo Claude Enterprise) |
| GitHub | cuenta personal | cuenta/org corporativa |
| Datos | ejemplos y proyectos propios | requerimientos reales de la empresa |
| Relación | **ninguna**: no hay sincronización, ni datos ni código compartido en tiempo real | **ninguna** |

Ambos parten de la **misma estructura base** (este roadmap + `system-prompt.md` + esquemas), pero cada uno se crea y evoluciona por separado.

**Fuera del alcance**
- Uso de la API pagada de Claude.
- Ejecutar pruebas desde el navegador (se delega a GitHub Actions o a la máquina local).
- Reemplazar a Notion como TMS oficial del equipo.

---

## 2. Restricciones que condicionan el diseño

| Restricción | Implicancia | Decisión |
|---|---|---|
| Ni Claude Enterprise ni Claude Pro incluyen acceso a la API; la API se cobra aparte por token | El front no puede llamar a Claude directamente sin costo | El Hub **no llama a Claude**: prepara el prompt y recibe la respuesta (Modo Puente) o delega en Claude Code (Modo Repo) |
| Claude Code está incluido en los planes pagados (Pro, Max, Team, Enterprise), y comparte el mismo cupo que el chat | Hay un agente capaz de leer/escribir archivos sin costo extra | Claude Code es el agente principal para tareas sobre archivos y generación de código |
| GitHub Pages es solo estático | No hay backend propio | Datos en el navegador + repo de datos vía GitHub API; procesos pesados en GitHub Actions |
| GitHub Models tiene capa gratuita con límites por minuto y por día, y dentro de Actions se autentica con `GITHUB_TOKEN` + `models: read` sin manejar secretos | Agente gratuito automatizable, con cupo acotado | Modo Automático vía Actions; tareas divididas en lotes pequeños |
| Copilot Free: cupo mensual reducido de chat | No alcanza como motor principal | Apoyo puntual en VS Code; en la empresa, depende de si hay Copilot corporativo |
| Modelos en el navegador (WebLLM/WebGPU) son gratuitos y privados, pero pequeños | Calidad menor y descarga inicial de cientos de MB | Opcional en el Hub Personal para tareas simples (clasificar, resumir), no para diseño de casos completos |

---

## 3. Modos de ejecución de agentes

El Hub define **qué** hace cada agente (`system-prompt.md`); el **modo** define **dónde** se ejecuta. El usuario elige el modo por tarea.

### Modo A — Puente con Claude (por defecto, $0)
1. El Hub arma el prompt completo: `§0 + agente + §9 + <context>` con el requerimiento y artefactos previos.
2. Botón **"Copiar prompt"** → se pega en un **Proyecto de Claude** (claude.ai) que tiene `system-prompt.md` como conocimiento.
3. Botón **"Pegar respuesta"** → el Hub extrae el JSON, lo valida contra el esquema y lo guarda con trazabilidad.
- **Empresa:** usa Claude Enterprise (los datos quedan dentro de la herramienta ya aprobada por la empresa).
- **Personal:** usa Claude Pro.
- Ideal para: análisis, riesgos, diseño de casos, reportes.

### Modo B — Repo con Claude Code ($0, consume cupo de la suscripción)
1. Los artefactos del Hub viven como archivos JSON en el **repo de datos** (`data/requirements/REQ-014.json`, etc.).
2. En la terminal, Claude Code ejecuta comandos del proyecto (`.claude/commands/`), por ejemplo `/qa-risks REQ-014` o `/qa-automate TC-014-007 playwright`.
3. Claude Code lee el JSON, aplica `system-prompt.md`, escribe el resultado y hace commit/PR.
4. El Hub refresca desde el repo y muestra los cambios.
- Ideal para: **generación de automatización** (escribe directo en los repos Playwright/Karate/Postman), lotes grandes, refactors.
- Copilot (VS Code) puede trabajar sobre los mismos archivos con `.github/copilot-instructions.md`.

### Modo C — Automático gratuito (cupo limitado)
- **C1. GitHub Models vía GitHub Actions:** el Hub dispara un `workflow_dispatch` (con un PAT fine-grained limitado al repo de datos); el workflow llama al modelo con `GITHUB_TOKEN`, guarda el JSON y hace commit. Sin secretos de IA.
  - Ideal para: tareas cortas y repetitivas (re-priorizar, normalizar, resumir un ciclo).
- **C2. WebLLM en el navegador:** modelo local, privado y offline tras la descarga; calidad limitada.
- **C3. APIs gratuitas de terceros** (p. ej. Gemini free tier, OpenRouter `:free`) vía adaptador OpenAI-compatible, con la key del usuario guardada solo en su navegador. Pueden usar los prompts para mejorar sus productos: **solo datos ficticios o propios no sensibles.**

> **Modo C completo es exclusivo del Hub Personal.** El Hub Empresa no incluye ni el código de los adaptadores C1/C2/C3: así se evita, por diseño, enviar requerimientos de la empresa a servicios no aprobados.

### Matriz de uso

| Tarea | Hub Empresa (Claude Enterprise) | Hub Personal (Claude Pro + gratuitos) |
|---|---|---|
| Análisis de requerimiento | A | A · C3 |
| Riesgos | A | A · C1 · C3 |
| Diseño de casos | A · B | A · B · C3 (en lotes) |
| Registro de ejecución / import | sin IA (parsers) | sin IA (parsers) |
| Borrador de defecto / resumen de ciclo | A | C1 · C2 · C3 (ahorra cupo de Pro) |
| Generación de automatización | B (Claude Code) | B (Claude Code) |

**Estrategia de cupo en Personal:** las tareas livianas van a C1/C2/C3 y el cupo de Claude Pro se reserva para diseño de casos y automatización.

---

## 4. Arquitectura

```
┌────────────────────── GitHub Pages (SPA) ──────────────────────┐
│ UI: Requerimientos · Riesgos · Casos · Ejecuciones · Automatiz. │
│ Prompt Composer  ← system-prompt.md                             │
│ Bridge: [Copiar prompt] / [Pegar respuesta] → validación Zod    │
│ Store: IndexedDB ⇄ Export/Import JSON ⇄ Repo de datos (API)     │
│ Importers: Playwright JSON · Karate JSON · Newman JSON          │
└───────────────┬──────────────────────────────┬─────────────────┘
                │ GitHub REST API (PAT)         │ workflow_dispatch
                ▼                               ▼
     Repo de datos (privado)  ◀── commits ── GitHub Actions
     data/*.json                              ├─ C1: GitHub Models
                ▲                             └─ ejecución de suites
                │ lee/escribe
     Claude Code / Copilot (local, Modo B) ──▶ Repos de automatización
```

**Stack:** Vite + React + TypeScript, Zod (validación de JSON de agentes), Dexie/IndexedDB, despliegue a Pages con GitHub Actions.

### Estructura del repositorio (igual en ambos Hubs)

```
qa-agentic-hub/
├── .github/
│   ├── workflows/
│   │   ├── deploy-pages.yml
│   │   └── agent-github-models.yml     # Modo C1
│   ├── copilot-instructions.md         # §8 de system-prompt.md
│   └── prompts/*.prompt.md
├── .claude/
│   └── commands/                       # Modo B
│       ├── qa-analyze.md
│       ├── qa-risks.md
│       ├── qa-design.md
│       ├── qa-automate.md
│       └── qa-report.md
├── CLAUDE.md                           # contexto para Claude Code
├── prompts/system-prompt.md
├── profile.yaml                        # variables §10 de ESTE hub
├── schemas/*.schema.json
├── templates/{playwright,karate,postman}/
├── data/                               # artefactos (en repo privado)
│   ├── requirements/  risks/  testcases/
│   ├── executions/    automation/
├── src/{agents,bridge,store,importers,ui}/
└── roadmap.md
```

> En el Hub Empresa, `data/` puede vivir en un repo privado separado si el front se publica desde un repo público.

### Modelo de datos

```
Requirement 1──* AcceptanceCriterion
Requirement 1──* Risk
Risk        *──* TestCase
TestCase    1──* Execution ──0..1 Bug
TestCase    1──0..1 Automation (framework, repo, path, estado)
Cada artefacto: { id, version, source: { mode: A|B|C1|C2, agent, date }, approvedBy }
```

---

## 5. Fases

### Fase 0 — Decisiones y spikes
- [ ] Crear el repo del Hub Personal (cuenta personal, tiempo personal).
- [ ] Crear el repo del Hub Empresa en la org (por separado).
- [ ] Spike Modo A: prompt de análisis en un Proyecto de Claude → pegar respuesta → validar JSON.
- [ ] Spike Modo B: comando `/qa-analyze` en Claude Code leyendo y escribiendo `data/`.
- [ ] Personal — spike C1: workflow con GitHub Models (`models: read`); medir cupo y calidad.
- [ ] Personal — spike C2/C3: WebLLM en el navegador y una API gratuita OpenAI-compatible (CORS, límites, calidad del JSON).
- [ ] Empresa: confirmar si la org permite Pages privado (si no, front público sin datos + `data/` en repo privado).
- [ ] Definir esquemas JSON en `schemas/`.

**DoD:** ADR con resultado de cada spike y modos habilitados por Hub.

### Fase 1 — MVP: Requerimiento → Análisis (Modo A)
- [ ] Scaffold Vite + React + TS y deploy a Pages.
- [ ] Formulario de requerimiento.
- [ ] Prompt Composer + botón **Copiar prompt** (incluye `<context>` y variables de `profile.yaml`).
- [ ] **Pegar respuesta**: extracción tolerante del JSON (con o sin bloque ```json), validación Zod, mensaje claro si no cumple.
- [ ] Vista de análisis con `clarifications` respondibles (genera un nuevo prompt de seguimiento).
- [ ] IndexedDB + export/import JSON.
- [ ] Proyecto de Claude configurado con `system-prompt.md` (guía en el README).

**DoD:** un requerimiento recorre Copiar → Claude → Pegar → guardado y trazado, en ambos Hubs.

### Fase 2 — Riesgos
- [ ] Agente de riesgos por Modo A.
- [ ] Matriz de calor 5×5 editable por el QA.

### Fase 3 — Diseño de casos
- [ ] Agente de diseño por Modo A (en lotes por AC si la respuesta es larga).
- [ ] Tabla editable + matrices `AC × TC` y `RSK × TC` con alertas de brechas.
- [ ] Export compatible con la base de casos en Notion (Hub Empresa).

### Fase 4 — Ejecución y registro (sin IA)
- [ ] Registro manual por ciclo; ambientes prohibidos bloqueados en la UI.
- [ ] Importadores Playwright / Karate / Newman JSON → mapeo por tag `@TC-*`.
- [ ] Dashboard de ciclo; recomendación GO / CAUTION / NO-GO (por reglas; opcionalmente redactada por IA).

### Fase 5 — Repo de datos + Modo B
- [ ] Sincronización IndexedDB ⇄ `data/` vía GitHub API (PAT fine-grained, solo ese repo).
- [ ] `CLAUDE.md` + comandos `.claude/commands/qa-*.md`.
- [ ] `/qa-automate`: plan → código en los repos de automatización siguiendo `templates/` → PR.
- [ ] `copilot-instructions.md` + prompt files para refinar en VS Code.

**DoD:** un caso `CANDIDATE` por framework termina en un PR que corre en local.

### Fase 6 — Modo C (solo Hub Personal) + CI (ambos)
- [ ] Personal: `agent-github-models.yml` (C1): recibe agente + IDs, llama al modelo, valida y hace commit.
- [ ] Personal: adaptadores C2 (WebLLM) y C3 (OpenAI-compatible) con selector de proveedor y control de cupo/lotes.
- [ ] Ambos: disparo de suites de automatización desde el Hub y regreso de resultados (patrón Newman existente: secretos por colección, enmascarado, htmlextra, Slack/Jira).

### Fase 7 — Integraciones (Hub Empresa)
- [ ] Sincronización con Notion vía GitHub Action.
- [ ] Creación de defectos en Jira.

### Fase 8 — Gobernanza
- [ ] Versionado de `system-prompt.md` + set de requerimientos de referencia para evaluar regresiones de prompts.
- [ ] Métricas: cobertura por AC/riesgo, automatizable vs automatizado, flakiness.
- [ ] Guía de uso para el equipo (Hub Empresa).
- [ ] Hub Personal opcional: Modo C2 (WebLLM).

---

## 6. Riesgos del proyecto

| Riesgo | P | I | Mitigación |
|---|---|---|---|
| Fricción del copiar/pegar en Modo A | 4 | 2 | Un solo clic por paso, prompt autocontenido, validación inmediata; Modo B para lotes |
| Respuesta de Claude con JSON inválido o incompleto | 3 | 3 | Extracción tolerante + Zod + prompt de corrección automático |
| Agotar el cupo de la suscripción (chat y Claude Code comparten límite) | 3 | 3 | Lotes pequeños, Modo C1 para tareas livianas, priorizar por riesgo |
| Datos de empresa en un servicio no aprobado | 1 | 5 | El Hub Empresa no incluye adaptadores Modo C; solo Claude Enterprise |
| Datos reales usados en el Hub Personal con proveedores gratuitos | 2 | 4 | Aviso visible en C3 + solo datos ficticios o propios |
| Mezcla de contenido entre Hubs | 2 | 4 | Repos y cuentas separadas; el Personal nunca recibe datos de la empresa |
| Alucinaciones en casos o scripts | 4 | 4 | Regla "no inventar", `clarifications`, revisión humana antes de PR |

---

## 7. Decisiones

**Resueltas**
- Dos Hubs **independientes**: Personal (GitHub personal + Claude Pro) y Empresa (GitHub org + Claude Enterprise).
- Sin API pagada.
- **Hub Empresa:** solo Claude Enterprise (Modos A y B).
- **Hub Personal:** Claude Pro (Modos A y B) + gratuitos (C1 GitHub Models, C2 WebLLM, C3 APIs gratuitas).

**Abiertas**
1. ¿La org permite Pages privado?
2. ¿Fuente de verdad de los datos en el Hub Empresa: repo privado o Notion?
3. Orden de frameworks en Fase 5 (sugerido: Postman → Karate → Playwright).
4. ¿Repos de automatización separados por framework o monorepo?
