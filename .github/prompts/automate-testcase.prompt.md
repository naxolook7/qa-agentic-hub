---
mode: agent
description: Automatiza un caso de prueba del Hub en el framework indicado
---

Lee el caso `${input:testcase:Ruta del JSON del caso, ej. data/testcases/TC-001-003.json}` y automatízalo en
`${input:framework:playwright | karate | postman}` siguiendo `.github/copilot-instructions.md` y `prompts/system-prompt.md` §6.

1. Si `automation` no es `CANDIDATE`, detente y explica por qué.
2. Propón primero el plan de archivos; luego genera el código.
3. Incluye el ID del caso en el nombre o tag del test.
