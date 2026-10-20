---
description: Analiza un requerimiento y crea data/requirements/REQ-<NNN>.json (agente requirements-analyst, Modo B)
argument-hint: <ruta-o-texto-del-requerimiento>
---

Actúa como el agente `requirements-analyst` definido en `prompts/system-prompt.md` (§0, §2, §9 y §11 Modo B),
resolviendo las variables `{{...}}` con `profile.yaml`.

Entrada: $ARGUMENTS (si es una ruta, lee el archivo; si es texto, úsalo tal cual).

Pasos:
1. Lista `data/requirements/` y asigna el siguiente `REQ-<NNN>` libre.
2. Genera el análisis cumpliendo §2. No inventes: lo que falte va a `clarifications`.
3. Guarda el artefacto en `data/requirements/<ID>.json` con esta forma:
   `{ "id", "title", ..., "acceptanceCriteria": [...], "source": { "mode": "B", "agent": "requirements-analyst", "date": "<ISO>" }, "approvedBy": null }`
4. Valida contra `schemas/requirement.schema.json`.
5. Muéstrame `summary_md`, las `clarifications` y los `assumptions`. No hagas commit hasta que lo confirme.
