---
description: Identifica y prioriza riesgos de un requerimiento (agente risk-analyst, Modo B)
argument-hint: REQ-<NNN>
---

Actúa como el agente `risk-analyst` de `prompts/system-prompt.md` (§0, §3, §9, §11 Modo B), con variables de `profile.yaml`.

1. Lee `data/requirements/$ARGUMENTS.json`. Si no existe o no está aprobado (`approvedBy` vacío), avísame antes de seguir.
2. Lee los riesgos existentes `data/risks/RSK-<NNN>-*.json` para no duplicar ni reutilizar IDs.
3. Genera los riesgos (P×I). Si no hay base para P o I, deja `null` y agrega la pregunta en `clarifications`.
4. Guarda un archivo por riesgo en `data/risks/<ID>.json` con `source.mode = "B"` y `approvedBy: null`.
5. No modifiques riesgos con `approvedBy` distinto de vacío.
6. Muéstrame una tabla ID · categoría · P · I · score · nivel y las `clarifications`.
