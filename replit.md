# StudyAce

StudyAce is a NEET/JEE study planner and productivity companion for organizing daily tasks, focus sessions, revision, mock tests, goals, journals, and progress.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/studyace` — the main StudyAce React/Vite app and Firebase-backed study flows
- `artifacts/api-server` — the shared Express API service
- `lib/api-spec/openapi.yaml` — the source of truth for shared API contracts
- `lib/db/src/schema` — the Drizzle schema location for server-side PostgreSQL data
- `vercel.json` — Vercel build and SPA output configuration

## Architecture decisions

- StudyAce keeps its existing Firebase Auth and Firestore data flows for user-facing study workspaces.
- Demo mode remains available when Firebase is not configured, so the preview is useful without credentials.
- The frontend builds to `artifacts/studyace/dist/public`, which is shared by the Replit static service and the root Vercel configuration.

## Product

StudyAce provides a focused dashboard for NEET/JEE aspirants, with daily planning, tasks, timetable and calendar views, focus sessions, progress analytics, mock tests, mistake tracking, revision, goals, journaling, profile settings, and an admin surface.

## User preferences

_No explicit preferences recorded._

## Gotchas

- Firebase configuration is optional for the preview; authenticated persistence requires the VITE_FIREBASE_* variables documented in `artifacts/studyace/.env.example`.
- If the shared OpenAPI spec changes, regenerate the clients before using updated types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
