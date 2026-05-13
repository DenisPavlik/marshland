# PLAN.md

Implementation plan grouped into three phases. Issue numbers reference the audit performed against the codebase (see conversation history).

---

## Phase 1 — Security & Critical Bugs

Fix issues that expose the app to abuse or break user-facing flows.

- [x] **#1 — Auth-guard `DELETE /api/jobs`** (`src/app/api/jobs/route.ts`)
  - Read session via `getUser()`; reject if no user.
  - Verify the caller has an active WorkOS membership in the job's `orgId` before deleting.

- [x] **#2 — Auth-guard + validate `POST /api/upload`** (`src/app/api/upload/route.ts`)
  - Require authenticated user.
  - Whitelist MIME types (image/png, image/jpeg, image/webp).
  - Cap file size (e.g. 5 MB).
  - Reconsider `ACL: 'public-read'` if not strictly needed. *(Kept — `next/image` references these URLs directly across the app; switching to signed URLs requires a separate refactor.)*

- [x] **#3 — Auth-guard `saveJobAction`** (`src/app/actions/jobActions.ts`)
  - On update path (when `id` is present): load the existing job, confirm caller has membership in that job's `orgId`.
  - On create path: confirm caller has membership in the submitted `orgId` (don't trust the form value blindly).

- [x] **#4 — Auth-guard `createCompany`** (`src/app/actions/workosActions.ts`)
  - Drop the `userId` parameter; derive it from `getUser()` server-side.
  - Validate company name (non-empty, trimmed, length limits).

- [x] **#6 — Add missing `return` statements in edit page** (`src/app/jobs/edit/[jobId]/page.tsx`)
  - Wrap each `<NoAccess />` JSX in `return ...` so execution actually halts.
  - After all guards pass, `user` is guaranteed non-null — remove the `user?.id` optional-chain workaround.

- [x] **#7 — Handle missing job on show page** (`src/app/show/[jobId]/page.tsx`)
  - If `JobModel.findById(jobId)` returns null, call `notFound()` from `next/navigation`.
  - Add `not-found.tsx` to render a friendly 404.

- [x] **#8 — Guard `<Image src>` against empty strings**
  - In `src/app/components/JobRow.tsx` and `src/app/show/[jobId]/page.tsx`: render a placeholder (or the FontAwesome fallback icon) when `jobIcon` / `contactPhoto` is falsy, instead of passing `""` to `next/image`.

---

## Phase 2 — UX/UI Polish + Full Redesign

Fix the remaining usability issues and rebuild the UI on pure Tailwind (remove `@radix-ui/themes` entirely).

- [x] **#9 — Make Hero search actually search** (`src/app/components/Hero.tsx`)
  - Wire the form to submit a `?q=` query param.
  - Filter jobs on the home page by `title` / `description` server-side (Mongo `$regex` or text index).

- [x] **#13 — Don't show "Post a job" to anonymous users** (`src/app/components/Header.tsx`)
  - Hide the button for unauthenticated visitors, or replace with a "Sign in to post" CTA that routes to `signInUrl`.

- [x] **#16 — Confirm before delete + soft refresh** (`src/app/components/JobRow.tsx`)
  - Replace `window.location.reload()` with `router.refresh()` from `next/navigation`.
  - Show a confirmation modal/dialog before issuing the DELETE.
  - Surface errors instead of swallowing them.

- [x] **#17 — Disable submit button during save** (`src/app/components/JobForm.tsx`)
  - Use `useFormStatus()` to read `pending` and disable the submit button.
  - Add a spinner / "Saving…" label.

- [x] **#23 — Add missing route-level states**
  - `src/app/not-found.tsx` — global 404.
  - `src/app/error.tsx` — global error boundary.
  - `src/app/loading.tsx` — global loading skeleton (and per-route where helpful).

- [x] **#40 — Remove Radix Themes entirely**
  - Uninstall `@radix-ui/themes`.
  - Drop `@radix-ui/themes/styles.css` and the `<Theme>` wrapper from `src/app/layout.tsx`.
  - Replace every Radix component with Tailwind equivalents:
    - `TextField.Root` / `TextArea` → styled `<input>` / `<textarea>`.
    - `RadioGroup` → custom Tailwind radio group (or native `<input type="radio">` with peer styles).
    - `Button` → styled `<button>`.
  - Keep accessibility: `<label>`, `aria-*`, visible focus rings.

- [x] **Full UI redesign** — rebuild every page/component with a cohesive Tailwind design system:
  - Establish design tokens via Tailwind config (color palette, spacing, radii, shadows, typography scale).
  - Rebuild: `Header`, `Hero`, `Jobs`, `JobRow`, `JobForm`, `ImageUpload`, `NoAccess`, `new-listing`, `new-company`, `show/[jobId]`, `jobs/[orgId]`, `jobs/edit/[jobId]`.
  - Verify mobile, tablet, desktop layouts.
  - Audit accessibility: labels on every input, `aria-label` on icon-only buttons, semantic `<a href="mailto:">` / `tel:` for contacts.

---

## Phase 3 — AI Feature: Job Application with Resume Upload + AI Autofill

Add a "Apply" flow on the job show page that lets candidates upload a resume (PDF) and uses the Anthropic API to extract their info and auto-fill the application form.

- [x] **Data model** — add `Application` Mongoose model
  - Fields: `jobId`, `fullName`, `email`, `phone`, `resumeUrl`, `linkedinUrl`, `workAuthorization`, `whyJoin`, `yearsOfExperience`, `gender`, `veteranStatus`, `disabilityStatus`, `createdAt`.
  - File: `src/models/Application.ts`.

- [x] **Resume upload endpoint** (`src/app/api/upload-resume/route.ts`)
  - Accept PDF only, max 10 MB.
  - Store in S3 under `resumes/` prefix.
  - URLs stored privately (no `ACL: public-read`) — recruiter view will need signed URLs.

- [x] **Anthropic SDK integration**
  - Installed `@anthropic-ai/sdk` (0.95.2).
  - Added `ANTHROPIC_API_KEY` placeholder to `.env.local`.
  - Client instantiated inline in `parseResumeAction.ts` (no separate memoized helper — single call site).

- [x] **Resume parsing server action** (`src/app/actions/parseResumeAction.ts`)
  - `parseResumeAction(base64Pdf)` — receives base64 PDF straight from client, sends as `document` content block.
  - Uses **tool use** (`save_parsed_resume`) with enum-constrained `yearsOfExperience` for guaranteed structured output.
  - Model: `claude-haiku-4-5-20251001`.
  - `next.config.mjs` bumped `experimental.serverActions.bodySizeLimit` to `15mb` so 10 MB PDFs (≈13 MB base64) fit through the server action body.

- [x] **Application form UI** (`src/app/show/[jobId]/apply/page.tsx` + `ApplyForm.tsx`)
  - Two-column layout with sticky sidebar showing job summary and main form on the right.
  - Sections: Personal info, Resume (drag-and-drop PDF upload), Profile (LinkedIn, work auth, motivation w/ 500-char counter), Experience, Voluntary disclosures (gender, veteran, disability).
  - "Autofill from resume" banner present as a placeholder — AI wiring still pending.
  - Submit → save `Application` doc, redirect to `/show/[jobId]/apply/success`.

- [x] **"Apply" CTA on the show page** (`src/app/show/[jobId]/page.tsx`)
  - Added a prominent CTA card between header and description linking to `/show/[jobId]/apply`. The legacy "Apply by contacting" card is kept as a secondary fallback.

- [x] **Recruiter view** — three-level navigation for org members
  - `src/app/jobs/[orgId]/applications/page.tsx` — list of jobs with `{newCount} new` + total count badges (single Mongo aggregation, no N+1).
  - `src/app/jobs/[orgId]/applications/[jobId]/page.tsx` — applications list with status pill and TimeAgo.
  - `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx` — full detail (contact, resume, profile, motivation, voluntary disclosures) with `MarkReviewedButton` client subcomponent.
  - `src/app/api/applications/[id]/resume/route.ts` — auth-gated S3 signed URL (1h) redirect via `@aws-sdk/s3-request-presigner`.
  - `markApplicationReviewed` server action added to `applicationActions.ts` with org-membership check.
  - `Application` model gained `status: "new" | "reviewed"` (indexed, default `"new"`).
  - Entry point: "Applications" pill in `JobRow.tsx` visible only to `jobDoc.isAdmin`.

---

**Status legend:** `[ ]` = todo, `[x]` = done. Update as we complete each task.
