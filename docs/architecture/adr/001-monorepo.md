# ADR-001: Repository organization (Monorepo)

- **Status:** Proposed — team decision required
- **Date:** 2026-10-23
- **Decision owners:** Project team

## Context
BrewLite includes a Next.js frontend and a NestJS backend for a coordinated course project, along with shared documentation.

## Proposal
Keep frontend, backend, and documentation in one Git repository with clear directory boundaries.

## Options
1. **Monorepo:** one repository with separate application directories.
2. **Multi-repo:** frontend, backend, and docs in separate repositories.

## Rationale
A monorepo can simplify setup, review, shared documentation, and coordinated API/UI changes.

## Consequences
**Benefits**
- One repository and unified review workflow.
- Easier coordination of API contracts and cross-layer changes.
- Requirements and architecture documents remain discoverable.

**Costs / risks**
- Shared repository permissions and branch conventions affect everyone.
- CI may need path filters as the project grows.
- App/tooling boundaries must remain clear.

## Follow-up
- [ ] Confirm this matches the team's actual repository decision.
- [ ] Document agreed directory layout and branch/PR process.
