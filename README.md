# CherryTrack Web Frontend

React 19 + TypeScript + Vite + Tailwind v4 web application for station staff: dashboard, farmers, deliveries, grading, payments, daily intake and capacity, prices and grades, reports, audit logs, stations, users and permissions, and settings. It is responsive (sidebar on desktop, bottom navigation and cards on phones) and contains no business rules: amounts, capacity and status transitions come from the backend (`backend/`).

Appearance: Light, Dark or System (saved per device) from the header toggle or Settings. Branding: administrators upload the company logo on **Settings** (shown in the sidebar and on the sign-in page); every user can add a profile photo on **My profile** (shown in the header). Photos are cropped to a square and shrunk in the browser before upload.

Stack: React Router, TanStack Query, React Hook Form + Zod, Recharts, lucide-react. Tests: Vitest + Testing Library, Playwright.

## Run

Requirements: Node 22+. The backend must be running (default `http://localhost:8080`).

```bash
npm ci
npm run dev            # http://localhost:5173, proxies /api to the backend
```

If the backend is on another port: `VITE_API_PROXY=http://localhost:8081 npm run dev`. The dev server proxies `/api`, so the browser sees one origin and the `SameSite=Strict` refresh cookie works exactly as in production.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run lint` / `npm run typecheck` | ESLint, strict TypeScript |
| `npm test` | Unit and component tests (mocked API) |
| `E2E_PASSWORD=... npm run e2e` | Playwright against the running stack with demo data (desktop and a Pixel 7 viewport) |
| `npm run build` | Production build in `dist/` |

## Docker

```bash
docker build -t cherrytrack-web .
docker run -p 8088:80 -e BACKEND_URL=http://host.docker.internal:8080 cherrytrack-web
```

nginx serves the build and proxies `/api/` to `BACKEND_URL`. Add `http://localhost:8088` to the backend's `CORS_ALLOWED_ORIGINS` only if you serve the UI from a different origin than the API.

## Structure

```text
src/api/        one module per backend resource, a single fetch client (token refresh, timeout, errors)
src/auth/       session, route guards, permission checks (the server enforces them too)
src/features/   one folder per page area (deliveries, farmers, intake, pricing, users, ...)
src/components/ shared UI (DataTable, layout, dialogs, capacity widgets)
src/lib/        types, formatting, hooks
```

Note: `src/api/client.ts` also contains the small native-app branch used by the Android project (`mobile-app/`); in a browser it is inactive.
