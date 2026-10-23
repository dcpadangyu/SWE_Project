# ADR-002: Data-access layer / ORM selection

- **Status:** Proposed — decision pending
- **Date:** 2026-10-23
- **Decision owners:** Project team

## Context
BrewLite plans PostgreSQL with a NestJS TypeScript backend. The choice should reflect existing dependencies, team familiarity, migration needs, and course requirements.

## Decision
**Pending team confirmation.** This ADR intentionally does not claim that Prisma, TypeORM, or another library has been selected.

## Options to evaluate
- **Prisma:** schema-driven client and migration workflow.
- **TypeORM:** entity/repository approach with NestJS integration.
- **SQL-first / another option:** only if appropriate to the team's requirements and skills.

## Criteria
1. Already installed/configured in backend.
2. Team familiarity and maintainability.
3. Migration and schema-review workflow.
4. Transactions for order creation and related records.
5. Testability and PostgreSQL compatibility.
6. Course constraints and documentation quality.

## Consequences
The selection affects schema definitions, migrations, repository patterns, test setup, and onboarding. Switching later can require refactoring and migration review.

## Follow-up
- [ ] Inspect backend package manifest and lockfile.
- [ ] Inspect current database/configuration files.
- [ ] Confirm selected tool with the team.
- [ ] Replace this draft with the agreed decision and rationale.
