# Plantilla Postman / Newman (Fase 5)

Estructura objetivo (§6.3):
```
collections/<modulo>.postman_collection.json   # v2.1, carpetas por flujo
environments/<ambiente>.postman_environment.json  # uno por ALLOWED_ENVIRONMENTS, valores vacíos
.github/workflows/run-collection.yml             # Newman + htmlextra + ::add-mask::
```
