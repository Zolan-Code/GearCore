# GearCore

ERP web progresivo (PWA) diseñado para talleres mecánicos independientes.

## Arquitectura

- **Frontend**: Next.js (App Router) + TypeScript + React (PWA)
- **Backend**: NestJS (REST API) + TypeScript
- **Base de Datos**: PostgreSQL vía Supabase con Prisma ORM
- **Autenticación y Autorización**: Supabase Auth (JWT) + RBAC (ADMINISTRADOR, RECEPCIONISTA, MECANICO)

## Estructura

- `backend/`: API NestJS, esquemas Prisma y guardias de autenticación/roles.
- `frontend/`: Aplicación Next.js con App Router, cliente Supabase y PWA manifest.
