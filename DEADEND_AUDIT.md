# Navigation Dead-End Audit

Scope: every `page.tsx` and global state file under `src/app/`. The sticky `Header`
(`src/app/components/Header.tsx`) is rendered on every route via
`src/app/layout.tsx:40`. It always exposes:

- logo -> `/`
- "Jobs" -> `/jobs`
- if signed in: "Post a job" -> `/new-listing` and "Sign out"
- if signed out: "Sign in"

That global header is the floor. The audit below treats the Header alone as
"insufficient" for any route where the natural next step is a contextual parent
(e.g. parent company, parent application list, parent job for an apply form),
because the Header gives no breadcrumb back to those scoped parents.

Reference convention (already in the codebase) — the apply page back link at
`src/app/show/[jobId]/apply/page.tsx:32-38`:

```tsx
<Link
  href={`/show/${jobId}`}
  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
>
  <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
  Back to job
</Link>
```

The same pattern is reused at `src/app/jobs/[orgId]/applications/[jobId]/page.tsx:67-73`
and `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx:110-116`.

---

## Critical (no recovery without browser back)

### 1. `error.tsx` — `src/app/error.tsx:16-32`

Current behavior: renders a "Try again" button that calls `reset()`. There is
no link home. If `reset()` keeps throwing (the common case, since `error.tsx`
typically catches data-fetch errors that will re-throw), the user is stuck on
the error page with only the Header (which itself renders inside the segment
that errored — fine in App Router because `error.tsx` is *below* the root
layout, but the user has no way to navigate to a known-good URL from inside
the error body itself).

What's missing: a literal "Return home" link as a second action. The copy
already says "...or head back home" but the link is not there.

Suggested fix — add next to the button:

```tsx
import Link from "next/link";

// ...inside the action row:
<div className="flex items-center justify-center gap-3">
  <button onClick={reset} className="btn-primary">
    Try again
  </button>
  <Link href="/" className="btn-ghost">
    Return home
  </Link>
</div>
```

### 2. `NoAccess` component — `src/app/components/NoAccess.tsx:1-12`

Current behavior: renders a centered "Access denied" message and nothing else.
This component is the only content of multiple gated pages:

- `src/app/new-listing/page.tsx:11` ("You need to be logged in to post a job!")
- `src/app/new-listing/[orgId]/page.tsx:15, 25`
- `src/app/new-company/page.tsx:8`
- `src/app/jobs/edit/[jobId]/page.tsx:19, 23, 31`
- `src/app/jobs/[orgId]/applications/page.tsx:21, 31`
- `src/app/jobs/[orgId]/applications/[jobId]/page.tsx:31, 51`
- `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx:76, 104`

Logged-out users hitting any of these see only the message; their Header
shows "Sign in" but there is no sign-in CTA in the body and no link to public
content. Logged-in users without org access see the same message with no
suggested next step.

What's missing: at minimum a "Browse jobs" link; ideally a contextual sign-in
CTA when the failure is "you need to login".

Suggested fix — extend `NoAccess` to accept an optional action and always
render a public fallback link:

```tsx
import Link from "next/link";

export default function NoAccess({
  text,
  action,
}: {
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="container text-center py-24">
      <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-3">
        Access denied
      </p>
      <h1 className="font-serif text-3xl text-gray-900 max-w-md mx-auto leading-tight">
        {text}
      </h1>
      <div className="mt-8 flex items-center justify-center gap-3">
        {action}
        <Link href="/jobs" className="btn-ghost">
          Browse all jobs
        </Link>
      </div>
    </div>
  );
}
```

(Callers can optionally pass `action={<Link href={signInUrl} className="btn-primary">Sign in</Link>}`
on the login-required cases.)

### 3. `/show/[jobId]` job detail — `src/app/show/[jobId]/page.tsx:32`

Current behavior: page opens directly into the article. There is no link back
to `/jobs`, no link to the hiring company at `/jobs/[orgId]`, and no
breadcrumb. The only forward action is "Apply for this role". A candidate who
arrives via a direct link (email, social) cannot reach the rest of the board
without using the Header's "Jobs" link, and cannot reach other roles at the
same company at all.

What's missing: a back link to `/jobs` AND a clickable company name that
goes to `/jobs/[orgId]`.

Suggested fix — add the standard back link above the header (line 33) and
make the company name clickable inside the header block:

```tsx
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

// at the very top of <article>:
<Link
  href="/jobs"
  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
>
  <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
  All jobs
</Link>
```

(Adding the company name link requires fetching `orgName` here — currently
the show page does not. A minimal fix is the "All jobs" back link.)

### 4. `/jobs/edit/[jobId]` admin edit form — `src/app/jobs/edit/[jobId]/page.tsx:33-37`

Current behavior: renders `<JobForm />` with no surrounding chrome. The
JobForm itself (`src/app/components/JobForm.tsx:119-128`) has no cancel
button, no back link, no breadcrumb. A user editing a role mid-fill has only
the browser back button to abandon the edit. On submit the form
`redirect()`s to `/jobs/[orgId]` (line 116), but mid-fill there is no exit.

What's missing: a "Back to company" link above the form and ideally a
"Cancel" button next to "Publish job" in the footer.

Suggested fix — wrap the form in the page (don't touch `JobForm` itself so
it can stay reusable from `/new-listing/[orgId]`):

```tsx
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

return (
  <div>
    <div className="container max-w-3xl pt-10">
      <Link
        href={`/jobs/${jobDoc.orgId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Back to company
      </Link>
    </div>
    <JobForm orgId={jobDoc.orgId} jobDoc={jobDoc} />
  </div>
);
```

### 5. `/new-listing/[orgId]` create-listing form — `src/app/new-listing/[orgId]/page.tsx:29`

Current behavior: renders bare `<JobForm orgId={orgId} />` — same situation
as #4 but for the create path. No back to the org-picker (`/new-listing`),
no cancel.

What's missing: a "Back to companies" link above the form.

Suggested fix:

```tsx
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

return (
  <div>
    <div className="container max-w-3xl pt-10">
      <Link
        href="/new-listing"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        Pick another company
      </Link>
    </div>
    <JobForm orgId={orgId} />
  </div>
);
```

### 6. `/new-company` form — `src/app/new-company/page.tsx:17-52`

Current behavior: form to create a WorkOS organization. No back link. After
submit `createCompany` redirects forward; but mid-fill the user has no way
back to `/new-listing` (where they were just sent to "Create a new company")
short of the browser back button or the Header logo.

What's missing: a "Back to companies" link above the header.

Suggested fix — insert above the `<header>` block at line 18:

```tsx
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

<Link
  href="/new-listing"
  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-8"
>
  <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
  Back to companies
</Link>
```

---

## Inconsistent (works but lacks breadcrumb / parent link)

### 7. `/jobs/[orgId]` company jobs — `src/app/jobs/[orgId]/page.tsx:32-43`

Current behavior: page shows the company name + a list of roles. Header has
"Jobs" but there is no in-body "All jobs" back link. A user landing here
from a Google result or a `JobRow` company-link click has no breadcrumb back
to `/jobs`.

What's missing: a back link above the header.

Suggested fix — insert at the start of the `<div className="pt-12">`:

```tsx
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

<div className="container">
  <Link
    href="/jobs"
    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors pt-8"
  >
    <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
    All jobs
  </Link>
</div>
```

### 8. `/jobs/[orgId]/applications` admin inbox — `src/app/jobs/[orgId]/applications/page.tsx:66-77`

Current behavior: shows the company name + the jobs-with-counts list. No
back link to `/jobs/[orgId]` (the public company page) or to `/new-listing`.
Children of this page (`.../applications/[jobId]` and `.../[applicationId]`)
both have "Back to ..." links in the standard convention; this parent does
not.

What's missing: a back link to the company page so an admin can pop out of
the inbox without going through the Header.

Suggested fix — insert at line 67 inside `<section>`:

```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

<Link
  href={`/jobs/${params.orgId}`}
  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-6"
>
  <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
  Back to company
</Link>
```

### 9. `/new-listing` org picker — `src/app/new-listing/page.tsx:30-101`

Current behavior: works fine for forward motion (pick a company or create
one). Has no back link, but as a top-of-flow page (entered from the Header's
"Post a job" CTA) this is acceptable. Listed here only because it would be
slightly more polished with a `/jobs` link in the empty state — currently
the empty state at line 70-78 says "No companies yet" with no in-body way
to leave the page if the user changed their mind. Not a critical dead end
(the Header "Post a job"/"Jobs" and logo all work), but mentionable.

Suggested fix (optional, low priority): inside the empty card at line 70,
add a small "Or browse roles others have posted" link to `/jobs`.

---

## Polished (already has clear navigation)

- **`/` (home)** — `src/app/page.tsx` + `src/app/components/Hero.tsx`. Hero's
  search form posts to `/jobs`. Header provides Jobs / Post a job / Sign in.
  Fine.
- **`/jobs`** — `src/app/jobs/page.tsx`. Top-of-flow; Header is sufficient.
  Each `JobRow` exposes deep links (company name, job title, admin actions).
  Fine.
- **`/show/[jobId]/apply`** — `src/app/show/[jobId]/apply/page.tsx:32-38`.
  Has the canonical back link. **This is the convention to copy elsewhere.**
- **`/show/[jobId]/apply/success`** — `src/app/show/[jobId]/apply/success/page.tsx:25-32`.
  Has two CTAs: "Back to job" and "Browse more roles". Excellent.
- **`/show/[jobId]/not-found`** — `src/app/show/[jobId]/not-found.tsx:13-15`.
  "Browse all jobs" CTA. Good. (Could optionally say "Browse all jobs"
  pointing at `/jobs` instead of `/`, since the current target is `/`.)
- **`/not-found`** (global) — `src/app/not-found.tsx:15-17`. "Return home" CTA.
  Good.
- **`/jobs/[orgId]/applications/[jobId]`** — has "All jobs" back link at
  line 67-73 (technically "All jobs" but it actually links to the
  applications inbox, not `/jobs` — minor label confusion; suggest renaming
  to "All applications" or "Back to inbox" for accuracy).
- **`/jobs/[orgId]/applications/[jobId]/[applicationId]`** — has "Back to
  applications" link at line 110-116. Good.
- **`/loading`** — `src/app/loading.tsx`. Transient state, no nav needed.

---

## Recommended convention

Place a single back link as the **first child inside the page's main `<section>`
or `<div>`**, before any `<header>` block, using the exact pattern from
`src/app/show/[jobId]/apply/page.tsx:32-38`:

```tsx
<Link
  href={<parent route>}
  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-swamp-600 transition-colors mb-6"
>
  <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
  <label>
</Link>
```

Use **a single "Back to <parent>" link** (not a full breadcrumb trail) on every
detail/form page; the project is shallow enough (max depth is 4 segments at
`/jobs/[orgId]/applications/[jobId]/[applicationId]`, and that page is already
correct) that a one-step back link is sufficient. Use a **full breadcrumb**
only if a page sits 3+ levels deep AND the intermediate levels are not
obviously named — currently no page meets that bar.

For terminal/error states (`error.tsx`, `not-found.tsx`, `NoAccess`, success
pages), always render **two** action buttons side-by-side: a primary recovery
action (try again / browse all jobs) and a secondary "Return home" or
"Browse all jobs" link. The success page at
`src/app/show/[jobId]/apply/success/page.tsx:25-32` is the model.

For multi-step forms (`JobForm`, `ApplyForm`, `new-company`), the back link
above the form is enough; do not add an in-form "Cancel" button unless users
report mid-fill confusion, since the back link is one click away and visible
above the fold.
