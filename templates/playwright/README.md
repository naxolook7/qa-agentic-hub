# Plantilla Playwright (Fase 5)

Estructura objetivo (§6.1):
```
tests/components/{TestContext.ts, ui/UiBase.ts, api/ApiBase.ts, TestFixture.ts}
tests/e2e/<modulo>/*.test.ts
tests/integration/<modulo>/*.test.ts
tests/setup/auth.setup.ts   # storageState, sin automatizar el login del IdP
tests/data/fixtures/*.json
```
Nombre de test: `'@TC-001-003 <título>'`.
