# Testing Strategy

## Overview

This project has two persistence boundaries (MongoDB via Mongoose for jobs/applications, WorkOS for users/orgs/memberships) that must stay in sync, plus three external IO surfaces (S3 uploads, S3 signed downloads, Anthropic resume parsing). The highest risk is not "does a button render" — it is **authorization drift** (the `listOrganizationMemberships` check is copy-pasted across `saveJobAction`, `DELETE /api/jobs`, `markApplicationReviewed`, and `GET /api/applications/[id]/resume`) and **schema drift** between client form fields and Mongoose/WorkOS validation. A regression in any of those leaks data or breaks writes silently.

The recommended strategy is three thin layers: (1) **unit tests** with mocked WorkOS/Mongoose for server actions and route handlers — fast, run on every commit, catch auth/validation regressions; (2) **integration tests** with `mongodb-memory-server` for the Mongoose models and the slice of server actions where DB behavior matters (uniqueness, enums, defaults); (3) **a handful of Playwright E2E tests** that exercise the two end-to-end journeys that span every boundary (post job, apply to job). Skip exhaustive component tests — the value is low for a portfolio project and React Server Components are awkward to unit-test. Aim for ~25-30 test files total, not 200.

## Critical user flows (test these first)

1. **Sign up → create company → post first job** — sign in via WorkOS, `POST /new-company` (`createCompany` action), redirected to `/new-listing`, choose org, fill `JobForm`, `saveJobAction` create-path runs, job appears at `/jobs/[orgId]` — **E2E (happy path) + unit (createCompany, saveJobAction create-branch)**
2. **Edit existing job (admin)** — `/jobs/edit/[jobId]` loads existing data, `saveJobAction` update-branch runs, `orgId` cannot be reassigned, revalidation hits `/jobs/[orgId]` — **unit (update branch, orgId pinning) + E2E (one happy path)**
3. **Public visitor applies to a job with resume autofill** — visit `/show/[jobId]/apply`, upload PDF, `parseResumeAction` fills fields, `submitApplication` validates + writes `Application`, redirect to success — **E2E + unit (submitApplication validation matrix) + unit (parseResumeAction with mocked Anthropic SDK)**
4. **Admin views applications and marks reviewed** — `/jobs/[orgId]/applications/[jobId]/[applicationId]`, click `MarkReviewedButton`, `markApplicationReviewed` enforces org membership, status flips to `reviewed`, revalidations fire — **unit (auth + happy path) + E2E (one path)**
5. **Admin downloads applicant resume** — `GET /api/applications/[id]/resume` checks auth + org membership, validates bucket prefix, returns signed URL redirect — **unit (auth matrix, bucket-prefix guard)**
6. **Job deletion (admin only)** — `DELETE /api/jobs?id=...`, must reject non-members with 403 — **unit (full auth matrix: anon, valid id but no membership, invalid id, not-found, success)**
7. **Resume + image upload validation** — `POST /api/upload` (auth required, image MIME, 5MB cap) and `POST /api/upload-resume` (no auth, PDF only, 10MB cap) — **unit with mocked S3 client**
8. **Auth-required pages redirect anon users** — `middleware.ts` matcher correctly covers `/`, `/new-listing*`, `/new-company`, `/jobs/*`, `/show/*` — **E2E smoke**

## Recommended tools

- **Unit/Integration:** **Vitest**. Native ESM + TS support, Jest-compatible API, faster watch loop, and `vi.mock` handles the WorkOS SDK and `next/cache`/`next/navigation` modules cleanly. Jest works too but its ESM story with Next 14 packages (`@workos-inc/authkit-nextjs` ships ESM) is noisier. There is no existing Jest config to preserve, so pick Vitest.
- **Component testing:** **React Testing Library + `@testing-library/user-event`**, rendered via `@vitejs/plugin-react`. Limit scope to the two client components with real logic: `JobForm` (controlled selects, hidden ID field) and `ApplyForm` (autofill state machine, resume upload error states). Skip presentational components.
- **E2E:** **Playwright**. Cypress is fine, but Playwright handles file uploads, multiple origins (WorkOS callback), and parallel browsers out of the box. Trace viewer is invaluable for debugging server-action redirects.
- **Mocking strategy:**
  - **WorkOS:** mock the `@workos-inc/node` and `@workos-inc/authkit-nextjs` modules with `vi.mock`. Create a small `tests/helpers/workos.ts` that returns canned `getUser`, `listOrganizationMemberships`, `getOrganization`, `createOrganization` responses. Never call the real API in unit tests.
  - **MongoDB:** for action/route handler unit tests, mock the Mongoose models (`vi.mock('@/models/Job')`). For model-layer tests and a couple of "real DB" integration tests, use **`mongodb-memory-server`** — it gives a real Mongo in-process, runs in CI without Docker, and starts in <2s. Do not use testcontainers here; the extra Docker dependency is overkill.
  - **S3:** mock `@aws-sdk/client-s3` (`S3Client.prototype.send`) and `@aws-sdk/s3-request-presigner` (`getSignedUrl`). Assert the `PutObjectCommand`/`GetObjectCommand` inputs (bucket, key prefix, ACL, ContentType).
  - **Anthropic SDK:** mock `@anthropic-ai/sdk` so `messages.create` returns a canned `tool_use` block. Cover: tool_use returned, no tool_use returned, malformed LinkedIn URL (tests `normalizeLinkedinUrl`).
  - **`next/cache` and `next/navigation`:** mock `revalidatePath` and `redirect` so actions can be called as plain functions and assertions can verify they were invoked with the right paths.
- **Test DB:** `mongodb-memory-server`, started once per test file in `beforeAll`, dropped in `afterEach`. No staging Mongo, no Atlas test cluster — keeps the suite hermetic.

## Priority order (what to test first)

### P0 — Critical (do these immediately)

- [ ] `saveJobAction` — unauthenticated user is rejected — `src/app/actions/__tests__/jobActions.test.ts`
- [ ] `saveJobAction` — user without org membership is rejected (cannot create job in someone else's org) — same file
- [ ] `saveJobAction` — create-path stores all required fields, returns serialized doc, calls `revalidatePath('/jobs/<orgId>')` — same file
- [ ] `saveJobAction` — update-path ignores `orgId` from formData (cannot move job to another org), uses the existing job's `orgId` for the membership check — same file
- [ ] `submitApplication` — rejects invalid ObjectId, missing job, missing required text fields, `whyJoin > 500` chars, invalid enum values — `src/app/actions/__tests__/applicationActions.test.ts`
- [ ] `submitApplication` — happy path creates `Application` with correct enum values and redirects — same file
- [ ] `markApplicationReviewed` — full auth matrix (anon, invalid id, missing app, missing job, non-member, success) — same file
- [ ] `DELETE /api/jobs` — full auth matrix incl. 401/400/404/403/200 branches — `src/app/api/jobs/__tests__/route.test.ts`
- [ ] `GET /api/applications/[id]/resume` — full auth matrix, bucket-prefix guard (rejects resumeUrl not in the expected bucket), returns redirect to signed URL — `src/app/api/applications/[id]/resume/__tests__/route.test.ts`

### P1 — Important

- [ ] `createCompany` — rejects anon, validates name length (2–100), creates org and admin membership in order, redirects — `src/app/actions/__tests__/workosActions.test.ts`
- [ ] `POST /api/upload` — auth required, MIME whitelist (png/jpeg/webp), 5MB cap, key includes `uniqid` prefix, returns expected public URL shape — `src/app/api/upload/__tests__/route.test.ts`
- [ ] `POST /api/upload-resume` — PDF only, 10MB cap, key prefixed with `resumes/`, returns URL within the expected bucket (so the download route's prefix check stays in sync) — `src/app/api/upload-resume/__tests__/route.test.ts`
- [ ] `parseResumeAction` — missing `ANTHROPIC_API_KEY` throws, empty base64 throws, tool_use block parsed, `normalizeLinkedinUrl` adds `https://` when missing, no tool_use returns `{}` — `src/app/actions/__tests__/parseResumeAction.test.ts`
- [ ] `addOrgAndUserData` — sets `orgName` and `isAdmin` correctly for users with/without memberships, handles `user === null` — `src/app/actions/__tests__/jobActions.test.ts` (same file as saveJobAction)
- [ ] `Application` model — Mongoose enum validation rejects invalid values; defaults `status` to `"new"`; `email` lowercased on save — `src/models/__tests__/Application.test.ts` (uses `mongodb-memory-server`)
- [ ] `Job` model — required-field validation matches what `JobForm` submits (catches schema drift) — `src/models/__tests__/Job.test.ts`

### P2 — Coverage

- [ ] `JobForm` component — submits hidden `id` when editing, omits it when creating; image upload populates hidden field — `src/app/components/__tests__/JobForm.test.tsx`
- [ ] `ApplyForm` component — autofill state machine (`idle → parsing → success/error`); upload error path; "Try again" resets state — `src/app/show/[jobId]/apply/__tests__/ApplyForm.test.tsx`
- [ ] E2E: anonymous visitor can browse `/`, open a job page, and reach `/show/[jobId]/apply` — `e2e/public-browsing.spec.ts`
- [ ] E2E: signed-in admin can create a company, post a job, see it on `/jobs/[orgId]` — `e2e/post-job-flow.spec.ts` (mocks WorkOS via Playwright route interception or a dev-only test login)
- [ ] E2E: visitor applies to a job with a fixture PDF, admin sees it under `/jobs/[orgId]/applications/[jobId]` and marks reviewed — `e2e/application-flow.spec.ts`
- [ ] E2E: middleware redirects anon users away from `/new-listing` and `/new-company` — `e2e/auth-redirects.spec.ts`

## Specific test files to create

Unit + integration (Vitest):

- `src/app/actions/__tests__/jobActions.test.ts` — `saveJobAction` create + update + auth matrix; `addOrgAndUserData` org/admin hydration
- `src/app/actions/__tests__/applicationActions.test.ts` — `submitApplication` validation matrix; `markApplicationReviewed` auth matrix
- `src/app/actions/__tests__/workosActions.test.ts` — `createCompany` validation + membership creation order
- `src/app/actions/__tests__/parseResumeAction.test.ts` — Anthropic SDK mocked; `normalizeLinkedinUrl` edge cases
- `src/app/api/jobs/__tests__/route.test.ts` — `DELETE` auth matrix
- `src/app/api/upload/__tests__/route.test.ts` — auth + MIME + size + S3 call
- `src/app/api/upload-resume/__tests__/route.test.ts` — MIME + size + key prefix
- `src/app/api/applications/[id]/resume/__tests__/route.test.ts` — auth + bucket-prefix guard + signed URL redirect
- `src/models/__tests__/Job.test.ts` — required fields, timestamps (uses memory server)
- `src/models/__tests__/Application.test.ts` — enums, defaults, email lowercase (uses memory server)
- `src/app/components/__tests__/JobForm.test.tsx` — controlled selects, hidden id field
- `src/app/show/[jobId]/apply/__tests__/ApplyForm.test.tsx` — autofill state machine

E2E (Playwright):

- `e2e/public-browsing.spec.ts` — anon browse + open apply page
- `e2e/post-job-flow.spec.ts` — admin posts a job
- `e2e/application-flow.spec.ts` — applicant applies, admin reviews
- `e2e/auth-redirects.spec.ts` — middleware matcher smoke

Shared helpers:

- `tests/helpers/workos.ts` — `mockWorkOS({ user, memberships, organizations })`
- `tests/helpers/mongo.ts` — `startTestDb()` / `stopTestDb()` / `clearCollections()` wrappers around `mongodb-memory-server`
- `tests/helpers/s3.ts` — captures `PutObjectCommand` input for assertions
- `tests/helpers/nextMocks.ts` — pre-baked mocks for `next/cache` (`revalidatePath`) and `next/navigation` (`redirect`)
- `tests/fixtures/resume.pdf` — small valid PDF for upload + parse tests

## CI integration

- GitHub Actions workflow `.github/workflows/test.yml` with two jobs:
  1. **unit** — `pnpm install --frozen-lockfile && pnpm test` (runs Vitest including `mongodb-memory-server` model tests). Node 20. Cache `~/.cache/mongodb-binaries` so the Mongo binary downloads once per cache key.
  2. **e2e** — `pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps chromium && pnpm build && pnpm test:e2e`. Runs only on PRs to `main` (skip on every push to keep feedback fast). Upload Playwright traces as artifacts on failure.
- Required env vars in CI: `MONGO_URI` (overridden by memory server in unit job; e2e can use memory server too via a global setup), `WORKOS_*` (use placeholder values — all WorkOS calls are mocked in unit tests; for E2E, intercept network or use a dev login bypass), `ANTHROPIC_API_KEY` (placeholder, mocked), `S3_*` (placeholder, mocked).
- Add a pre-push hook (husky or simple `package.json` `pre-push` script) running `pnpm lint && pnpm test --run` to keep the loop tight locally.
- Coverage is **not** a gate. Track it via `vitest --coverage` and look at it during reviews, but do not block PRs on a percentage — for a portfolio project, that incentivizes the wrong tests.

## Setup steps

1. Install dev dependencies:
   ```
   pnpm add -D vitest @vitest/coverage-v8 @vitejs/plugin-react jsdom \
              @testing-library/react @testing-library/user-event @testing-library/jest-dom \
              mongodb-memory-server \
              @playwright/test
   ```
2. Create `vitest.config.ts` at repo root with: `plugins: [react()]`, `test.environment: 'jsdom'`, `test.setupFiles: ['./tests/setup.ts']`, `test.globals: true`, resolve alias `@` → `./src` (mirror `tsconfig.json`).
3. Create `tests/setup.ts` — imports `@testing-library/jest-dom/vitest`, loads `.env.test` via `dotenv`, sets default mocks for `next/navigation` and `next/cache` (`vi.mock` at top level).
4. Create `.env.test` with placeholder values for `WORKOS_*`, `S3_*`, `ANTHROPIC_API_KEY`. **Do not** set `MONGO_URI` — the memory-server helper provides it.
5. Create `tests/helpers/mongo.ts` exporting `startTestDb()` (starts `MongoMemoryServer`, sets `process.env.MONGO_URI`, `mongoose.connect`) and `stopTestDb()` (disconnect + stop). Wire into `beforeAll`/`afterAll` per-suite (not globally — only model tests need a real DB).
6. Create `playwright.config.ts`: `testDir: 'e2e'`, `webServer: { command: 'pnpm build && pnpm start', port: 3000, reuseExistingServer: !process.env.CI }`, single Chromium project, `trace: 'on-first-retry'`.
7. Add `package.json` scripts:
   ```
   "test": "vitest",
   "test:run": "vitest run",
   "test:coverage": "vitest run --coverage",
   "test:e2e": "playwright test",
   "test:e2e:ui": "playwright test --ui"
   ```
8. Add `e2e/`, `tests/`, and `playwright-report/` to `.gitignore` where appropriate (keep test sources, ignore reports/results).
9. Write the four P0 server-action / route-handler tests first (auth matrices) — this is where bugs hide and where Vitest+mocks pay off fastest. Get those green before touching components or E2E.
10. Add the GitHub Actions workflow last, once the local suite is stable.
