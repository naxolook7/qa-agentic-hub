# Instrucciones para GitHub Copilot — QA Agentic Hub

Aplica `prompts/system-prompt.md` §0.2 y §6. Resumen:

- **No inventes** selectores, endpoints, payloads ni reglas de negocio: si faltan, deja `TODO(<pregunta>)`.
- **Sin secretos** en el código: variables de entorno y archivos de ambiente con placeholders.
- **Nunca** apuntes a ambientes prohibidos (ver `FORBIDDEN_ENVIRONMENTS` en `profile.yaml`).
- Toma como entrada el JSON del caso (`data/testcases/TC-*.json`) y mantén su ID en el nombre o tag del test.
- Antes de crear componentes, busca y reutiliza los existentes en el repo destino.
- Sin esperas fijas (`sleep`, `waitForTimeout`); usa esperas por condición.
- Playwright: capas tipo KATA o el POM existente del repo; locators `getByRole`/`getByLabel`/`getByTestId`.
- Karate: datos en JSON, `match` sobre esquema, tags `@TC-*`.
- Postman: colección v2.1, un `pm.test` por validación, secretos solo desde variables de ambiente.
