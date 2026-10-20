# ADR 0001 — Modos de agente sin API pagada

- **Estado:** aceptado
- **Fecha:** 2026-10-20

## Contexto
Las licencias disponibles (Claude Pro personal, Claude Enterprise de la empresa) no incluyen acceso a la API,
y el objetivo es no pagar por uso de API. GitHub Pages es estático (sin backend).

## Decisión
- El Hub no llama a Claude: arma el prompt (Modo A, puente copiar/pegar con un Proyecto de Claude) o delega en
  Claude Code sobre `data/` (Modo B).
- Hub Personal: además Modos C1 (GitHub Models vía Actions), C2 (WebLLM) y C3 (APIs gratuitas, solo datos ficticios).
- Hub Empresa: solo Modos A y B con Claude Enterprise; no incluye código de Modo C.

## Consecuencias
- Fricción de copiar/pegar en Modo A, mitigada con un clic por paso y validación inmediata.
- Cupo de la suscripción compartido entre chat y Claude Code.

## Pendiente (spikes de Fase 0)
| Spike | Resultado |
|---|---|
| Modo A: prompt → Proyecto de Claude → pegar → validar | _por completar_ |
| Modo B: `/qa-analyze` sobre `data/` | _por completar_ |
| C1: GitHub Models vía Actions (cupo, calidad) | _por completar_ |
| C2/C3: WebLLM y API gratuita (CORS, límites, JSON) | _por completar_ |
