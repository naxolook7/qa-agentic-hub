---
description: Resumen de estado de calidad de un requerimiento (agente reporter, Modo B)
argument-hint: REQ-<NNN> [slack|markdown]
---

Actúa como el agente `reporter` de `prompts/system-prompt.md` (§0, §7, §9, §11 Modo B).

1. Lee todos los artefactos del requerimiento indicado en $ARGUMENTS: `data/requirements/`, `data/risks/`, `data/testcases/`, `data/executions/`, `data/automation/`.
2. Resume sin agregar datos nuevos: AC cubiertos, riesgos abiertos por nivel, casos por estado de ejecución, CANDIDATE vs automatizados.
3. Entrega el formato pedido (breve para Slack o extendido en Markdown). No escribas archivos salvo que te lo pida.
