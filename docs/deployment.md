# BrewLite deployment guide

This document describes the production topology represented by the Vietnamese
diagram [`diagrams/deployment.svg`](diagrams/deployment.svg) and the English
diagram [`diagrams/deployment-en.svg`](diagrams/deployment-en.svg). The provider names are
examples: the same separation works with Render, Railway, Fly.io or a VPS.

## 1. Runtime topology

```text
Browser/PWA
    |
    | HTTPS
    v
Next.js web service / CDN
    |
    | HTTPS REST (CORS allow-list)
    v
NestJS API container :8080
    |                    \
    | TLS/private 5432    \ HTTPS
    v                      v
PostgreSQL + volume       Mock Payment Gateway
```

- **Web service** serves the Next.js frontend and public static assets. It must
  not receive database credentials.
- **API service** runs the NestJS application. The application listens on
  `PORT`, defaulting to `8080`; the platform's public HTTPS endpoint terminates
  TLS and forwards traffic to that port.
- **PostgreSQL** is a managed database with persistent storage, automated
  backups and a private connection whenever the provider supports one.
- **Payment gateway** is reached only by the API. Browser code must never
  contain payment secrets.

## 2. Environment boundaries

| Environment | Purpose | Data and secrets |
| --- | --- | --- |
| Local | Developer feedback and manual testing | `.env` files are untracked; services use localhost |
| CI | Install, lint, test and build on every change | Use CI secret store only; do not connect to production DB |
| Production | Public customer traffic | Provider-managed secrets, HTTPS, persistent DB and backups |

The repository's `backend/.env.example` is the source of truth for the current
backend variables:

```dotenv
PORT=8080
DATABASE_URL=<postgres connection string>
JWT_SECRET=<long random value>
```

The frontend should receive only non-secret public configuration, such as the
HTTPS API base URL (for example `NEXT_PUBLIC_API_URL`). Add a variable to the
frontend environment only when the frontend code actually consumes it.

## 3. Production configuration

### Web service

1. Set the root directory to `frontend`.
2. Install with `npm ci`.
3. Build with `npm run build`.
4. Start with `npm run start`.
5. Set the production API base URL to the public HTTPS NestJS endpoint.
6. Configure the platform domain and HTTPS certificate.

### API service

1. Set the root directory to `backend`.
2. Install with `npm ci`.
3. Build with `npm run build`.
4. Start with `npm run start:prod`.
5. Set `PORT` to the platform-provided port, normally `8080`.
6. Set `DATABASE_URL` and `JWT_SECRET` in the provider secret store.
7. Set CORS to the exact production web origin when CORS is enabled.
8. Configure a health check at `GET /health` (or the application health route
   exposed by the current API implementation).

### Database

- Provision PostgreSQL with persistent storage; do not run PostgreSQL as an
  ephemeral application container.
- Restrict inbound access to the API service or private network.
- Require TLS when the provider exposes PostgreSQL outside its private network.
- Run schema migrations as an explicit release step before serving code that
  depends on the new schema.
- Enable automated backups and periodically verify a restore.

## 4. Networking and security

- Public traffic is HTTPS only. Redirect or reject plain HTTP at the edge.
- The browser talks to the web service and API using HTTPS; the database is
  never browser-accessible.
- Allow only the API service to reach PostgreSQL on port `5432`.
- Keep `JWT_SECRET`, `DATABASE_URL` and payment credentials out of source,
  frontend bundles, logs and image files.
- Use separate credentials and databases for local, CI and production.
- Set a restrictive CORS allow-list; do not use `*` with credentialed requests.
- Redact authorization headers, cookies, tokens and database URLs from logs.

## 5. Health checks, logs and operations

- The platform should restart the API when the process exits unexpectedly.
- A health check should verify that the process is accepting HTTP traffic and,
  where appropriate, that the database connection is usable.
- Emit structured logs to stdout/stderr so the hosting provider can collect
  them. Include request correlation IDs when available.
- Monitor HTTP error rate, latency, restart count, database connection errors
  and payment failures.
- Keep deployment logs separate from application logs and retain them according
  to the team's operational policy.

## 6. Deployment flow

1. CI runs frontend/backend lint, tests and production builds.
2. The database migration is reviewed and applied in a controlled release
   step.
3. Deploy the API, then verify its health endpoint and logs.
4. Deploy the frontend with the API's stable HTTPS URL.
5. Smoke-test login, menu browsing, checkout and order tracking.
6. If the release fails, roll back the application image/build; restore the
   database only after assessing whether a backward-compatible migration can
   be reversed safely.
