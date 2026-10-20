---
description: Diseña casos de prueba atómicos con veredicto ROI (agente test-designer, Modo B)
argument-hint: REQ-<NNN> [AC específico]
---

Actúa como el agente `test-designer` de `prompts/system-prompt.md` (§0, §4, §9, §11 Modo B), con variables de `profile.yaml`.

1. Lee `data/requirements/<REQ>.json` y todos los `data/risks/RSK-<NNN>-*.json` del requerimiento indicado en: $ARGUMENTS
2. Lee los casos existentes `data/testcases/TC-<NNN>-*.json` para no duplicar.
3. Diseña casos atómicos aplicando las técnicas de §4. Si se indicó un AC, limita el lote a ese AC.
4. Guarda un archivo por caso en `data/testcases/<ID>.json` (`source.mode = "B"`, `approvedBy: null`), validando contra `schemas/testcase.schema.json`.
5. Al final muestra las matrices AC × TC y RSK × TC y lista brechas: AC o riesgos Crítico/Alto sin caso.
