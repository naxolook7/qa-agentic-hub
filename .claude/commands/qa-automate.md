---
description: Planifica y genera la automatización de un caso CANDIDATE en Playwright, Karate o Postman (agente automation-engineer, Modo B)
argument-hint: TC-<NNN>-<NNN> <playwright|karate|postman>
---

Actúa como el agente `automation-engineer` de `prompts/system-prompt.md` (§0, §6, §9, §11 Modo B), con variables de `profile.yaml`.

Argumentos: $ARGUMENTS

1. Lee `data/testcases/<TC>.json`. Si `automation` no es `CANDIDATE`, detente y pregúntame.
2. Identifica el repo destino del framework en `AUTOMATION_REPOS` de `profile.yaml` y revisa su estructura real
   (si no está clonado localmente, pídeme la ruta). Respeta sus convenciones; usa `templates/<framework>/` solo si el repo está vacío.
3. **Primero entrega el plan** (archivos a crear/modificar, componentes que reutilizas, datos y variables de ambiente necesarios)
   y espera mi confirmación.
4. Tras confirmar: crea la rama `qa/<TC>` en el repo destino, escribe el código con el ID del caso en el nombre/tag del test,
   sin secretos ni esperas fijas, y ejecútalo localmente si es posible.
5. Registra `data/automation/AUT-<TC>.json` con `path`, `framework`, `repo`, `branch`, `coversTestCases` y `source.mode = "B"`.
6. Propón el PR con descripción: caso cubierto, cómo ejecutarlo y resultado de la ejecución local.
