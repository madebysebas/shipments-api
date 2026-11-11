# shipments-api

[![CI](https://github.com/madebysebas/shipments-api/actions/workflows/ci.yml/badge.svg)](https://github.com/madebysebas/shipments-api/actions/workflows/ci.yml)

A small shipment-tracking REST API. It is a sample project that shows how I structure a backend service: a clear API contract, a status state machine, safe concurrent updates, and tests that run against a real database.

**Stack:** NestJS 11 · TypeScript · Prisma · PostgreSQL · Jest + Supertest · Docker · GitHub Actions

## What it does

A shipment moves through a fixed lifecycle, and every change is stored as an event:

```
CREATED ──> IN_TRANSIT ──> DELIVERED
   │             │
   └─────────────┴──────> CANCELLED
```

| Method | Path | Description |
|---|---|---|
| `POST` | `/shipments` | Create a shipment. `reference` is unique; a duplicate returns `409`. |
| `GET` | `/shipments?status=&limit=&cursor=` | List shipments, newest first, with cursor pagination. |
| `GET` | `/shipments/:id` | Get one shipment with its event history. |
| `POST` | `/shipments/:id/events` | Move the shipment to a new status. Invalid transitions return `409`. |

## Design decisions

- **State machine in one place.** Allowed transitions live in [`status.ts`](src/shipments/status.ts) and are unit-tested on their own.
- **Safe under concurrency.** A status change is a conditional `UPDATE ... WHERE status = <the status I read>` inside a transaction with the event insert. If two requests race, one wins and the other gets `409`; the history never gets a duplicate event.
- **Cursor pagination.** Ordered by `(createdAt, id)`, so pages stay stable while new shipments arrive.
- **Validation at the edge.** DTOs with `class-validator`; unknown fields are stripped and bad input returns `400`.
- **Tests hit a real PostgreSQL.** No mocked database, so constraints, transactions and migrations are exercised for real, locally and in CI.

## Run it

```bash
docker compose up --build
```

The API listens on `http://localhost:3000` and migrations are applied on start.

```bash
curl -X POST localhost:3000/shipments \
  -H 'content-type: application/json' \
  -d '{"reference":"REF-001","origin":"Bogotá","destination":"Miami"}'
```

## Develop and test

```bash
cp .env.example .env
docker compose up -d db
npm install
npx prisma migrate deploy
npm test          # unit + e2e
npm run start:dev
```

## Project structure

```
prisma/        schema and migrations
src/
  shipments/   controller, service, DTOs, state machine
  app.module.ts
  prisma.service.ts
test/          end-to-end tests
```
