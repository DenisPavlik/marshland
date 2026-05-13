# Animation Opportunities

## Current state (audit baseline)

- **No animation library** installed (no `framer-motion`, `motion`, `auto-animate`, `react-spring` in `package.json`). Tailwind 3.4 + the built-in `animate-spin` / `animate-pulse` are all that's available today.
- **One custom keyframe** is already defined: `fade-up` (in `tailwind.config.ts`), used in `Hero.tsx` via `opacity-0 animate-fade-up [animation-delay:...]`. This pattern is the foundation we should extend.
- **`globals.css`** already standardises `transition-all duration-200` on `.btn-primary`, `.btn-ghost`, `.input-base`, `.card` and a `hover:scale-[1.03]` on the primary button — so most hover micro-interactions exist; the gaps are state changes, page transitions, list reveals, and feedback.
- Reduced-motion is **not respected** anywhere. Any keyframe we add should be wrapped in `motion-safe:` or the keyframe itself should respect `prefers-reduced-motion`.

> Bias of this plan: stay on Tailwind. The job board is small (~10 routes, mostly static reads); installing framer-motion costs ~50 kB gz and would only earn its keep in two places (job list stagger + delete confirm modal). See "Recommended library decision" at the bottom.

---

## High-Impact (do these first)

### 1. Staggered fade-up for the job list

- **Where:** `src/app/components/Jobs.tsx:36-38` (the `jobs.map` rendering `<JobRow>`); also the search results in `src/app/jobs/page.tsx:245-249`.
- **What:** Each `JobRow` fades up sequentially with a 40–60 ms delay between rows. On filter change (`/jobs?q=...`), this gives perceptible feedback that the list updated, instead of an instant content swap.
- **Why:** The `/jobs` page already has aggressive filtering (search, work mode, employment, salary). Filter submit currently feels like a hard page reload because results pop in. A staggered reveal converts that pop into a "the list responded to me" cue. Also masks server-render latency without a skeleton.
- **How (Tailwind-only, no JS):** Reuse the existing `animate-fade-up` keyframe. Move the wrapping `div` to set per-child delay via inline style, since Tailwind arbitrary `[animation-delay:Nms]` can't be index-driven:

  In `Jobs.tsx`:
  ```tsx
  <div className="flex flex-col gap-3">
    {jobs?.map((job, i) => (
      <div
        key={job._id}
        className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100"
        style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
      >
        <JobRow jobDoc={job} />
      </div>
    ))}
  </div>
  ```
  Cap the delay (`Math.min(i, 8)`) so list pages with 50 jobs don't make the last row wait 2.5 s. Do the same in `src/app/jobs/page.tsx`.

  Add to `tailwind.config.ts` a slightly snappier variant since the existing 600 ms is tuned for hero text — list rows want ~400 ms:
  ```ts
  animation: {
    "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
    "fade-up-sm": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
  },
  ```

---

### 2. Animated entry / exit for the delete-confirm overlay

- **Where:** `src/app/components/JobRow.tsx:144-182` — the `confirmOpen && (...)` modal-style overlay inside the card.
- **What:** Currently it mounts instantly with full backdrop blur, which feels jarring because it's an *in-card* overlay on top of content the user can still see edges of. Fade the backdrop in (150 ms) and have the inner button group scale-fade in (200 ms, slight `translate-y`).
- **Why:** The confirm overlay is destructive UX. A 150–200 ms reveal gives the user a beat to register what changed before clicking — without slowing anyone down. Today's instant swap reads like a bug.
- **How (Tailwind-only):** Add two keyframes; use them on mount. Because React unmounts on `confirmOpen=false` we don't need exit anim (or we can keep it Tailwind-simple and skip exit).

  Add to `tailwind.config.ts`:
  ```ts
  keyframes: {
    "fade-up": { ... },
    "fade-in": {
      "0%": { opacity: "0" },
      "100%": { opacity: "1" },
    },
    "pop-in": {
      "0%": { opacity: "0", transform: "translateY(4px) scale(0.96)" },
      "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
    },
  },
  animation: {
    "fade-in": "fade-in 0.15s ease-out both",
    "pop-in": "pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
  },
  ```

  Then in `JobRow.tsx`:
  ```tsx
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Confirm delete"
    className="absolute inset-0 z-10 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center p-5 motion-safe:animate-fade-in"
  >
    <div className="text-center max-w-sm motion-safe:animate-pop-in">
      {/* ...existing content... */}
    </div>
  </div>
  ```

---

### 3. Optimistic row removal on delete

- **Where:** `src/app/components/JobRow.tsx:32-43` (`handleDelete`).
- **What:** Today, after a successful `DELETE`, we close the modal and call `router.refresh()`. The row stays mounted until the server round-trip completes. Animate the row collapsing out (opacity 0, scale 0.98, max-height 0) immediately after the API succeeds — `router.refresh()` can finish in parallel.
- **Why:** This is the single most "broken-feeling" interaction in the app: click Delete → 500 ms of nothing → row just disappears. A 250 ms exit makes the action feel direct and confirms the destructive operation succeeded.
- **How (Tailwind-only, no library):**
  ```tsx
  const [isExiting, setIsExiting] = useState(false);

  async function handleDelete() {
    setError(null);
    try {
      await axios.delete("/api/jobs?id=" + jobDoc._id);
      setConfirmOpen(false);
      setIsExiting(true);
      setTimeout(() => {
        startTransition(() => router.refresh());
      }, 250);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to delete");
    }
  }

  return (
    <article
      className={`group relative card p-5 hover:shadow-card-hover hover:ring-swamp-200
        transition-all duration-300 ease-out overflow-hidden
        ${isExiting ? "opacity-0 scale-[0.98] max-h-0 !p-0 !my-0 ring-0" : "max-h-[400px]"}`}
    >
  ```
  Note the `max-h-[400px]` baseline is required because we can't animate `height: auto`. Pick a value taller than the largest row.

---

### 4. Sticky header background transition on scroll

- **Where:** `src/app/components/Header.tsx:9`.
- **What:** Today the header is permanently `bg-white/85 backdrop-blur-md`. At the top of the page (especially the Hero) the white-on-white pill below the logo and the heavy blur look unwarranted. Make the header transparent at scroll-top and animate to the current backdrop-blur state after ~40 px.
- **Why:** This is the single biggest "feels designed" affordance you can add to a marketing-style landing page like Marshland. Costs almost nothing.
- **How:** Tiny client component to track scroll. Header is currently `async` (server) — wrap *just the wrapper div* in a thin client component or use a CSS-only approach with `scroll-timeline` (not yet broadly supported, skip).

  Simplest: extract a `HeaderShell.tsx` client wrapper:
  ```tsx
  "use client";
  import { useEffect, useState } from "react";

  export default function HeaderShell({ children }: { children: React.ReactNode }) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
      const onScroll = () => setScrolled(window.scrollY > 24);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return (
      <header
        className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300
          ${scrolled
            ? "bg-white/85 backdrop-blur-md border-b border-gray-200"
            : "bg-transparent border-b border-transparent"}`}
      >
        {children}
      </header>
    );
  }
  ```
  Then in `Header.tsx` swap the `<header>` for `<HeaderShell>` and keep the inner `<div className="container ...">` server-rendered (user/email still come from `getUser()`).

---

### 5. Loading state with skeleton rows, not a centred spinner

- **Where:** `src/app/loading.tsx` (global Suspense fallback). It's currently a centred spinner.
- **What:** Replace the universal spinner with route-aware skeleton rows that mimic `JobRow` (16 px logo block, two text-line bars, button row). Use Tailwind's `animate-pulse`.
- **Why:** The dominant data routes are `/jobs`, `/jobs/[orgId]`, and `/show/[jobId]` — all card-shaped lists/detail. A centred spinner causes a layout shift when the actual content arrives. Skeletons preserve layout and feel ~2× faster (perceived performance literature is solid here).
- **How:** Make `loading.tsx` route-specific by creating `src/app/jobs/loading.tsx` (and `src/app/jobs/[orgId]/loading.tsx`). For the list:
  ```tsx
  export default function JobsLoading() {
    return (
      <section className="container py-10">
        <div className="h-10 w-48 bg-gray-100 rounded mb-8 animate-pulse" />
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <div className="card p-5 h-96 animate-pulse" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-5 flex gap-4 animate-pulse">
                <div className="size-14 rounded-xl bg-gray-100" />
                <div className="grow space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-5 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  ```
  Leave the root `src/app/loading.tsx` spinner as a fallback for routes without their own skeleton.

---

## Medium-Impact

### 6. Resume drop-zone "active drag" animation

- **Where:** `src/app/show/[jobId]/apply/ApplyForm.tsx:368-381` — the resume drop zone.
- **What:** When `dragOver === true`, add a subtle pulse on the cloud icon and brighten the dashed border (already done, but instant). Animate the border-dash offset for a "marching ants" feel, and scale the icon up 5 %.
- **Why:** Drop zones are one of the rare UX situations where animation is *functional*, not decoration — it confirms the OS-level drag event is being captured.
- **How:** Add a keyframe and apply only while `dragOver`:
  ```ts
  // tailwind.config.ts
  keyframes: {
    "march": {
      "0%":   { "background-position": "0 0" },
      "100%": { "background-position": "16px 0" },
    },
  },
  animation: {
    "march": "march 0.6s linear infinite",
  },
  ```
  Then drag-active state on the zone:
  ```tsx
  className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
    ${dragOver
      ? "border-swamp-500 bg-swamp-50 scale-[1.01]"
      : "border-gray-300 hover:border-swamp-400 hover:bg-gray-50"}`}
  ```
  And on the `faCloudArrowUp` icon inside, conditional `motion-safe:animate-bounce` while `dragOver`. (Keep it short — pure feedback.)

---

### 7. Autofill success / error state crossfade

- **Where:** `src/app/show/[jobId]/apply/ApplyForm.tsx:243-307` — the autofill card.
- **What:** When `autofillState` transitions `parsing → success`, the icon, title, body text, and button all swap atomically. Crossfade the icon (200 ms) and slide the success copy in.
- **Why:** AI-parsing UX has a strong delight pay-off when it lands. Right now success is invisible work — users may not realise their fields got populated. A small visual confirmation pairs with the "Fields filled from your resume ✓" copy.
- **How:** The icon container already changes class on state. Wrap it in a keyed div so React remounts it, then `animate-fade-in` on the new state:
  ```tsx
  <div
    key={autofillState}
    className="motion-safe:animate-fade-in"
  >
    <FontAwesomeIcon icon={...} className={...} />
  </div>
  ```
  Pair with a subtle scale on success: `autofillState === "success" && "scale-110 transition-transform duration-300"` on the outer 40-px tile (already has `bg-white ring-1 ring-swamp-200`).

  Additionally, the parsed fields (`fullName`, `email`, etc.) update without any cue. Briefly highlight each input that just got auto-filled. Track which ones changed and add a 1.5 s ring pulse:
  ```tsx
  // when autofillState becomes "success", set a Set<string> of filled fields,
  // clear it 1500 ms later
  className={`input-base ${justFilled.has("email") ? "ring-swamp-400 motion-safe:animate-pulse" : ""}`}
  ```

---

### 8. Form submission success → /apply/success route

- **Where:** `src/app/show/[jobId]/apply/success/page.tsx` (the success page).
- **What:** Animate the green check tile in with a slight scale bounce, then fade in the text below.
- **Why:** This is the application's emotional payoff moment. Worth one staggered reveal.
- **How:** Use existing `animate-fade-up` plus a new `animate-pop-in` (defined in #2):
  ```tsx
  <div className="container max-w-md text-center py-24">
    <div className="size-16 mx-auto rounded-2xl bg-swamp-50 ring-1 ring-swamp-200 flex items-center justify-center mb-6 motion-safe:animate-pop-in">
      <FontAwesomeIcon icon={faCheck} className="text-swamp-500 text-2xl" />
    </div>
    <p className="font-mono ... opacity-0 motion-safe:animate-fade-up [animation-delay:120ms]">Application received</p>
    <h1 className="font-serif ... opacity-0 motion-safe:animate-fade-up [animation-delay:200ms]">We&apos;ve got it from here.</h1>
    <p className="text-gray-500 ... opacity-0 motion-safe:animate-fade-up [animation-delay:280ms]">...</p>
    <div className="flex ... opacity-0 motion-safe:animate-fade-up [animation-delay:360ms]">...</div>
  </div>
  ```

---

### 9. Radio-pill / radio-card selection feedback

- **Where:**
  - `src/app/components/JobForm.tsx:55-71` (RadioCardGroup, work mode / engagement).
  - `src/app/show/[jobId]/apply/ApplyForm.tsx:107-124` (RadioPills, work auth / gender / etc.).
- **What:** When `:checked` state flips, the current `transition-all` on bg + ring is fine, but the *label text colour change* (`group-has-[:checked]:text-swamp-700`) is instant. Add the text colour to the transition and a brief scale on the parent.
- **Why:** Radio groups are one of the few places where the user is actively asking "did it register?" Without the existing instant ring change, an extra 150 ms of scale gives haptic-like feedback.
- **How:** Already mostly there — just include `transition-colors` on the inner span and add a tiny `active:scale-[0.98]` to the label:
  ```tsx
  <label
    className="group cursor-pointer flex items-center gap-3 px-4 py-2.5 rounded-xl
      bg-white ring-1 ring-gray-200 hover:ring-swamp-300
      transition-all duration-200 active:scale-[0.98]
      has-[:checked]:bg-swamp-50 has-[:checked]:ring-swamp-500"
  >
    ...
    <span className="text-sm text-gray-700 transition-colors group-has-[:checked]:text-swamp-700 group-has-[:checked]:font-medium">
      {opt.label}
    </span>
  </label>
  ```

---

### 10. `whyJoin` character counter colour transition

- **Where:** `src/app/show/[jobId]/apply/ApplyForm.tsx:494-496` — `{whyText.length}/500`.
- **What:** As the counter approaches the limit, animate it from gray-400 → amber-500 (at 80 %) → red-500 (at 100 %).
- **Why:** Constraint-aware feedback that's almost invisible until it matters. Cheap.
- **How:** No keyframe needed, just a class swap with transition:
  ```tsx
  <div
    className={`mt-1 text-right font-mono text-xs transition-colors
      ${whyText.length >= 500 ? "text-red-500"
        : whyText.length >= 400 ? "text-amber-500"
        : "text-gray-400"}`}
  >
    {whyText.length}/500
  </div>
  ```

---

### 11. Hero search-bar focus ring expansion

- **Where:** `src/app/components/Hero.tsx:41-48`.
- **What:** When the search input is focused, in addition to the existing focus ring, gently expand its glow (box-shadow). Brings life to the otherwise static hero after the load-in animation finishes.
- **Why:** The hero already animates in nicely. Once the animation is done it's static; one focused-state flourish keeps it feeling responsive.
- **How:** Tailwind arbitrary box-shadow:
  ```tsx
  <input
    type="search"
    name="q"
    ...
    className="input-base pl-11
      focus:shadow-[0_0_0_6px_rgba(74,124,89,0.10)]
      focus:ring-swamp-500/60
      transition-shadow duration-300"
  />
  ```

---

## Polish / Nice-to-have

### 12. JobRow logo subtle scale on group hover

- **Where:** `src/app/components/JobRow.tsx:48-71`.
- **What:** Card already has `group` and `hover:shadow-card-hover`. Add `group-hover:scale-[1.04]` and `transition-transform` on the logo container so the icon swells slightly on hover.
- **Why:** Reinforces hover affordance on a clickable card; ties the existing shadow upgrade to a movement cue.
- **How:**
  ```tsx
  <div className="shrink-0 transition-transform duration-300 group-hover:scale-[1.04]">
    {jobDoc.jobIcon ? ( ... ) : ...}
  </div>
  ```

### 13. CTA arrow icon slide on hover (already partial)

- **Where:** `src/app/new-listing/page.tsx:60-63` already does this (`group-hover:translate-x-0.5`). Apply the same pattern to:
  - `src/app/show/[jobId]/page.tsx:84-90` — "Apply for this role" button with `faArrowRight`.
  - `src/app/components/Header.tsx:63-65` — "Post a job" button (no arrow today; add one or skip).
- **What:** Wrap the button in `group` and arrow gets `transition-transform group-hover:translate-x-0.5`.
- **Why:** Consistency — the same micro-interaction exists in one place; replicate it on all forward-action CTAs.
- **How:**
  ```tsx
  <Link href={...} className="btn-primary mt-4 sm:mt-0 shrink-0 group">
    Apply for this role
    <FontAwesomeIcon
      icon={faArrowRight}
      className="size-3.5 transition-transform group-hover:translate-x-0.5"
    />
  </Link>
  ```

### 14. NoAccess page fade-up

- **Where:** `src/app/components/NoAccess.tsx`.
- **What:** Three lines of text appear with the existing `animate-fade-up` staggered delay.
- **Why:** Right now it's a static dead-end. A 400 ms reveal turns it from "error wall" into "intentional moment".
- **How:** Same delay pattern as the Hero — wrap each text node:
  ```tsx
  <div className="container text-center py-24">
    <p className="... opacity-0 motion-safe:animate-fade-up [animation-delay:50ms]">Access denied</p>
    <h1 className="... opacity-0 motion-safe:animate-fade-up [animation-delay:150ms]">{text}</h1>
  </div>
  ```

### 15. 404 / error pages

- **Where:** `src/app/not-found.tsx`, `src/app/error.tsx`.
- **What:** Same staggered fade-up as `NoAccess`. On the error page, optionally a subtle shake on the "Try again" button on first mount (one-shot, not on retry).
- **Why:** Keeps the brand tone ("Lost in the swamp.") feeling deliberate rather than thrown together.
- **How:** Apply `opacity-0 motion-safe:animate-fade-up [animation-delay:...ms]` to each of the four child elements. Skip the shake unless explicitly asked — it's borderline gimmicky.

### 16. ImageUpload preview crossfade

- **Where:** `src/app/components/ImageUpload.tsx:46-68`.
- **What:** When `url` becomes truthy and the image finishes loading, fade the image in over the spinner. Today: spinner disappears, image pops in at full opacity.
- **Why:** Tiny consistency tweak. Especially noticeable when re-uploading.
- **How:**
  ```tsx
  {!isUploading && url && (
    <Image
      src={url}
      ...
      onLoad={() => setIsImageLoading(false)}
      className={`size-full object-cover transition-opacity duration-300
        ${isImageLoading ? "opacity-0" : "opacity-100"}`}
    />
  )}
  ```

### 17. Filter sidebar "Apply" feedback

- **Where:** `src/app/jobs/page.tsx:225-227` — Apply button (full page reload via GET form submit).
- **What:** When the user clicks Apply, the page reloads. The button gives no in-between feedback. Either: (a) add `useFormStatus` and show a spinner on the button while Next.js fetches the new RSC payload, or (b) rely on `loading.tsx` skeletons (#5).
- **Why:** Option (b) is simpler and consistent with the rest of the app. Mention this only as a follow-up if skeletons feel insufficient.
- **How:** Implement #5 first. If still laggy-feeling, add a `useFormStatus`-aware submit button (same pattern as `JobForm.tsx:25-39`).

### 18. Footer fade-in on first paint

- **Where:** `src/app/layout.tsx:42-49`.
- **What:** The footer is `mt-24` below content. On short routes (e.g. 404), it's visible immediately. Add a small fade-in.
- **Why:** Honestly minor — only mention because it's a one-line change. Skip if pressed for time.
- **How:** Add `animate-fade-up [animation-delay:400ms] opacity-0` to the `<footer>`. Keep delay high so it doesn't compete with hero animations.

---

## Recommended library decision

**Stay Tailwind-only. Do not install framer-motion for this scope.**

Rationale:

1. **The hardest animation in this plan is #3 (row exit on delete)**, and it's still trivially expressible with a `setTimeout` + class swap (~10 lines). Framer-motion's `<AnimatePresence>` would be cleaner but not 50 kB cleaner.
2. **#1 (staggered list)** is solved by inline `animationDelay` style — no library needed.
3. **The codebase already establishes the pattern**: `tailwind.config.ts` defines one keyframe (`fade-up`); `Hero.tsx` uses it with `opacity-0 animate-fade-up [animation-delay:...ms]`. Three more keyframes (`fade-in`, `pop-in`, `march`) extend that vocabulary and cover every item above.
4. **No layout animations are needed.** Nothing in this app reorders, drags between containers, or uses shared-element transitions. Framer-motion's strongest features (`layoutId`, `<Reorder>`, gesture system) would go unused.
5. **Bundle weight matters here.** The app already ships WorkOS SDK, AWS SDK, Anthropic SDK, FontAwesome, Mongoose-on-server. Don't add a fourth animation paradigm.

**Re-evaluate framer-motion only if** the project grows: drag-and-drop application kanban for admins, animated charts on a dashboard, or shared-element transitions between `/jobs` list and `/show/[jobId]` detail. None of those are in scope today.

### Single config addition that unlocks everything above

Add to `tailwind.config.ts` `extend.keyframes` / `extend.animation`:

```ts
keyframes: {
  "fade-up": {
    "0%": { opacity: "0", transform: "translateY(12px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "fade-in": {
    "0%": { opacity: "0" },
    "100%": { opacity: "1" },
  },
  "pop-in": {
    "0%": { opacity: "0", transform: "translateY(4px) scale(0.96)" },
    "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
  },
  "march": {
    "0%":   { "background-position": "0 0" },
    "100%": { "background-position": "16px 0" },
  },
},
animation: {
  "fade-up":    "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
  "fade-up-sm": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
  "fade-in":    "fade-in 0.15s ease-out both",
  "pop-in":     "pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
  "march":      "march 0.6s linear infinite",
},
```

### Reduced-motion discipline

Every new animation utility should be applied with the `motion-safe:` variant (e.g. `motion-safe:animate-fade-up`) and paired with `motion-reduce:opacity-100` where the element starts at `opacity-0`. Failing to do this makes the site unusable for users with `prefers-reduced-motion: reduce`, because they'd see invisible content forever.
