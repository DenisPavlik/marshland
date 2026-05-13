# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Language

Always communicate with the user in Ukrainian language, but write all code, comments, variable names, and file contents in English.

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Commands

- `pnpm dev` — run Next.js dev server (port 3000)
- `pnpm build` — production build
- `pnpm start` — run production build
- `pnpm lint` — Next.js / ESLint

There is no test suite in this repo.

## Required environment variables (`.env`)

- `MONGO_URI` — MongoDB connection string (mongoose)
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD` — WorkOS AuthKit + organizations API
- `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY` — AWS credentials for the `denys-job-board` S3 bucket (region `us-east-1`, hardcoded in `src/app/api/upload/route.ts`)

S3 public URLs are served from `denys-job-board.s3.amazonaws.com`; this hostname is allow-listed in `next.config.mjs` for `next/image`.

## Architecture

Next.js 14 App Router (TypeScript, Tailwind, Radix UI Themes, FontAwesome). Two persistence boundaries live side-by-side and you must keep them in sync:

1. **MongoDB (Mongoose)** — stores `Job` documents. The schema lives in `src/models/Job.ts`; the model is registered with the `models?.Job || model(...)` idiom to survive Next.js hot reload. Every server-side entry point that touches jobs calls `await mongoose.connect(process.env.MONGO_URI)` before querying — there is no shared connection helper, so new server code must do the same.
2. **WorkOS** — owns users *and* companies (`organizations`) *and* membership/role data. Companies are not stored in Mongo; only `orgId` is denormalized onto each `Job`. UI that needs a company name or "am I admin?" hydrates jobs via `addOrgAndUserData` in `src/app/actions/jobActions.ts`, which fans out to `workos.organizations.getOrganization` and `workos.userManagement.listOrganizationMemberships`. This is an N+1 pattern by design — preserve it unless explicitly refactoring.

Auth flow:

- `src/middleware.ts` runs `authkitMiddleware()` only on the matcher-listed routes (`/`, `/new-listing*`, `/new-company`, `/jobs/*`, `/show/*`). Adding a new authenticated route requires editing this matcher.
- `src/app/api/auth/callback/route.ts` is the WorkOS sign-in callback (`handleAuth()`).
- Server components/actions read the session via `getUser()` from `@workos-inc/authkit-nextjs`.

Server actions (`'use server'`) carry the write paths:

- `saveJobAction` (jobActions.ts) handles both create and update keyed off a hidden `id` form field, then `revalidatePath('/jobs/<orgId>')`.
- `createCompany` (workosActions.ts) creates a WorkOS organization and immediately attaches the caller as `admin` membership before redirecting to `/new-listing`.
- Job deletion is the one HTTP route (`DELETE /api/jobs?id=...`); file uploads go through `POST /api/upload` which streams to S3 with a `uniqid()`-prefixed key and returns the public URL.

Routing notes:

- Dynamic segments use the `orgId` / `jobId` convention: `/jobs/[orgId]`, `/jobs/edit/[jobId]`, `/show/[jobId]`, `/new-listing/[orgId]`.
- TS path alias `@/*` → `./src/*` (see `tsconfig.json`).
- `react-country-state-city` is used in `JobForm` with `//@ts-ignore` — it has no types and writes `countryId`/`stateId`/`cityId` plus their resolved names into the form data; both halves must be persisted because the IDs are needed to rehydrate the cascading selects on edit.
