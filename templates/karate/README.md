# Plantilla Karate (Fase 5)

Estructura objetivo (§6.2):
```
src/test/java/<paquete>/<Modulo>Runner.java
src/test/resources/karate-config.js
src/test/resources/<modulo>/<modulo>-api.feature
src/test/resources/<modulo>/data/<modulo>-<metodo>.json
src/test/resources/<modulo>/mock/{<modulo>-mock.feature, mock-responses.json}
```
Ejecución: `mvn test -Dtest=<Modulo>Runner -Dkarate.env=dev`.
