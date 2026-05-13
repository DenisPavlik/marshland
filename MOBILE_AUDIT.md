# Mobile UX Audit

Scope: every component under `src/app/components/` and every page under `src/app/`. Tailwind config exposes breakpoints `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1200`, `2xl: 1320`. `container` has `padding: 1.5rem` on mobile and `2rem` from `lg` up. Default mobile-first design target is iPhone SE (375px).

Global observation up front: `src/app/layout.tsx` defines `metadata` but does **not** export `viewport`. Next.js 14 will fall back to a sensible default, but the App Router-recommended pattern is an explicit `export const viewport = { width: 'device-width', initialScale: 1 }`. Worth adding so we control zoom behavior and theme color consistently — see `src/app/layout.tsx:26-30`.

---

## Critical Issues (P0 — broken on mobile)

- **[Header] Nav links hidden on mobile with no replacement** — ✅ FIXED. Added `MobileMenu.tsx` client component with hamburger toggle on `<sm:`. Desktop nav/cluster hidden on mobile; full menu (Browse/Jobs/Sign in/out/Post a job) lives in the dropdown panel.

- **[Header] Right-hand cluster collides with logo at narrow widths** — ✅ FIXED. Desktop right cluster is now `hidden sm:flex`; only logo + hamburger render on `<sm:`. Container gap reduced to `gap-3 sm:gap-6`.

- **[Header] Sign-out button is below the 44×44 touch target** — ✅ FIXED. Both the desktop Sign-out button (`min-h-[44px] px-3`) and the mobile menu variant have proper 44px targets.

- **[Hero] H1 overflows at 375px** — ✅ FIXED. Reduced to `text-5xl sm:text-6xl md:text-7xl` with relaxed `leading-[1.05]` on mobile.

- **[Hero] Search row breaks because button never wraps** — `src/app/components/Hero.tsx:31-53`. The form uses `flex items-center gap-2 max-w-md` and the button has `whitespace-nowrap`. On a 375px screen the input shrinks to ~200px after the `Search` pill, which is cramped, and the input's placeholder `Search by title, skill, company…` is fully truncated. Switch to `flex-col sm:flex-row` and make the button `w-full sm:w-auto` so on mobile users get a full-width search field followed by a full-width button.

- **[JobForm] react-country-state-city dropdowns are unstyled / overflow** — `src/app/components/JobForm.tsx:260-291` imports the library's own CSS (`react-country-state-city/dist/react-country-state-city.css`) and the three selects are placed in `grid sm:grid-cols-3 gap-3`. The lib renders fixed-width dropdown popups that, on mobile, can extend off the right edge of the viewport (no `width: 100%` override) and the search input inside the popup is not full-width. Combined with the missing native types (`//@ts-ignore`), there is no responsive sizing applied. Wrap each select in a `w-full` container and add a global override in `globals.css` targeting `.stdropdown-container` / `.stsearch-box input` to force `width: 100%`.

- **[JobForm] Contact-person row overflows on small screens** — `src/app/components/JobForm.tsx:156` uses `flex gap-4` (no responsive variant) between the 96×96 `ImageUpload` and a stack of three inputs. On 375px viewports the upload tile (`size-24` = 96px) plus `gap-4` plus the inputs (each with `pl-10` padding + icon) leaves the email/phone inputs ~190px wide, and the placeholder text + icon clips. Add `flex-col sm:flex-row` so on mobile the avatar sits above the field stack.

- **[JobForm] Salary input row overflows the right `k/year` adornment** — `src/app/components/JobForm.tsx:244-256`. The input has `pl-7 pr-16` plus an absolute `k/year` suffix, but `font-mono` and `placeholder="120"` already eats space. On 375px in the `sm:grid-cols-3` grid the salary cell takes the full column at mobile (single-col), so this one is OK in isolation — but once the user types `120000` (no separator), the digits collide with the `k/year` suffix. Either increase `pr-20`, or strip the suffix and rely on the label.

- **[JobRow] Admin action buttons overflow on small phones** — `src/app/components/JobRow.tsx:106-140`. The card has Applications, Edit, Delete pills (each `px-3 py-1 text-xs`) + TimeAgo, all inside a `flex-wrap items-center justify-between`. With the 56px (`size-14`) logo and `gap-4` on the parent flex, the inner column is ~250–270px on iPhone SE. Three pills + their gaps total ~280px, so they wrap but the TimeAgo `ml-auto` then jumps onto its own line at the right edge, looking detached. Acceptable, but the **delete confirm dialog** at line 144-181 is `absolute inset-0` covering the entire card — on a short card the Cancel + Delete buttons (each `btn-ghost`/`btn-primary` = 40px) can collide with the card edges via `p-5`. Verify on 320px.

- **[JobRow] Pill action buttons are below 44px touch target** — ✅ FIXED. Pills bumped to `py-2 min-h-[44px] text-sm` with `size-3.5` icons.
- **[Touch targets — global pass]** — ✅ FIXED. Added `min-h-[44px]` to `.btn-primary`, `.btn-ghost`, `.input-base` in `globals.css`. Bumped `JobForm` RadioCardGroup labels, `ApplyForm` RadioPills, autofill button, resume remove button, and `jobs/page.tsx` CheckboxRow to 44px targets. ImageUpload Replace now inherits `btn-ghost`'s 44px instead of overriding.

- **[Jobs filters] Sidebar not collapsible on mobile** — ✅ FIXED. Created `FiltersAside.tsx` client wrapper that renders a toggle button (with active filter count badge) on `<lg:` and keeps the form always-visible on `lg+`.

- **[ApplyForm] Autofill row crams CTA against text on mobile** — `src/app/show/[jobId]/apply/ApplyForm.tsx:243-298`. The hero card uses `flex items-start gap-4` with an icon, copy block (grow), and a CTA button (shrink-0). On 375px the headline `Autofill from resume` plus the button `Upload & autofill` (~150px wide) leaves ~120px for the description text, which wraps to 4–5 lines, making the row tall and the button awkwardly mid-card. Switch to `flex-col sm:flex-row` and make the button `w-full sm:w-auto`.

- **[ApplyForm] Resume drop zone is click-only on mobile** — ✅ FIXED. Detects touch devices via `matchMedia("(hover: none) and (pointer: coarse)")`, removes drag/drop event handlers on touch, and swaps copy to "Tap to upload your resume". Added `min-h-[120px]` to dropzone.

---

## High Priority (P1 — poor mobile UX)

- **[Header] No mobile email visibility** — `src/app/components/Header.tsx:44-49`. The signed-in email is `hidden md:inline-block`. Below `md:` (768px) there is no indication of who is signed in. Either show an avatar or a truncated "you@…" string from `sm:` up.

- **[Hero] Excessive vertical padding on mobile** — `src/app/components/Hero.tsx:6` uses `pt-20 pb-24` unconditionally. On a 667px tall phone, that's ~176px of empty space around the headline before the user can scroll to anything. Use `pt-12 pb-16 sm:pt-20 sm:pb-24`.

- **[Hero] Background blob may cause horizontal overflow** — `src/app/components/Hero.tsx:7-10`. The decorative `size-[600px]` blob is absolutely positioned and `pointer-events-none`, but the parent has `overflow-hidden` (line 6) which protects against scrollbars — verify it isn't causing pinch-zoom weirdness. Acceptable but worth confirming on a real device.

- **[Jobs sticky filters waste content space on tablet/mobile]** — `src/app/jobs/page.tsx:143` uses `lg:sticky lg:top-24` for the filter aside. Below `lg` the aside is not sticky, so this is fine — but the `top-24` value is tied to the Header's height. Header is `py-4` + content, so ~64px. `top-24` = 96px. If you ever reduce the header height on mobile, recheck this offset.

- **[Jobs page] Header counts text wraps clumsily** — `src/app/jobs/page.tsx:136-139`. `{jobs.length} {jobs.length === 1 ? "role" : "roles"}{hasFilters ? " matching your filters" : " available"}` reads fine on desktop, but on mobile the H1 `text-4xl "All roles"` plus this caption already takes 3 lines. Acceptable, but consider shortening to `{N} roles · filtered`.

- **[Jobs.tsx header row]** — `src/app/components/Jobs.tsx:13-22`. `flex items-end justify-between` with a `text-3xl` heading on the left and a small "N results" count on the right. The count has no `shrink-0`/`whitespace-nowrap`, so on small screens with long headers like `Roles at Some Very Long Company Name` the count can be pushed to a new line and lose its alignment with the heading baseline. Add `whitespace-nowrap shrink-0` to the span on line 18.

- **[JobRow] Logo + content gap is tight on 320px** — `src/app/components/JobRow.tsx:46-72`. `card p-5` + `flex gap-4` + 56px logo + `min-w-0` content. On iPhone SE (375px, padding 24*2 = 48px gone → 327 inner; subtract another card padding 20*2 = 40 → 287; subtract logo 56 + gap 16 = 72 → 215px for content). Tight but workable. Consider reducing `p-5` to `p-4` on mobile (`p-4 sm:p-5`) to reclaim space.

- **[JobRow] Title font may overflow long job titles** — `src/app/components/JobRow.tsx:81`. `font-serif text-xl` with no `truncate` or `line-clamp`. A title like "Senior Staff Backend Engineer (Distributed Systems)" wraps to 3 lines on mobile in 215px. Add `line-clamp-2` to keep cards a consistent height, and rely on the detail page for full text.

- **[JobRow] Delete confirm modal does not lock body scroll** — `src/app/components/JobRow.tsx:144-181`. The "modal" is `absolute inset-0` within the card, but it's also `role="dialog" aria-modal="true"`. Because it's only overlaying the card (not the viewport), users can scroll past it, which is fine — but they can also tap delete on another card. Either disable other cards while open, or convert to a full-screen modal on mobile.

- **[JobForm] Submit button alignment** — `src/app/components/JobForm.tsx:306-308`. `flex justify-end` shoves the Publish button to the right corner on mobile. Touch is easier when primary actions are full-width on mobile. Change to `flex justify-end` → `flex justify-end` + give the button `w-full sm:w-auto` (and `px-6` instead of `px-12` on mobile so it isn't unnecessarily wide).

- **[JobForm] Text input font size may trigger iOS zoom** — All `input-base` inputs (`src/app/globals.css:48-54`) inherit no explicit `font-size`. Tailwind defaults pick up `1rem` (16px), which is exactly at the iOS auto-zoom threshold. The title input on line 140 adds `text-lg` (18px) — safe. But the salary input on line 251 is `font-mono` with no size override, which Plus Jakarta Sans + JetBrains Mono might compute below 16px depending on browser. To be safe, set `input-base` to include `text-base` explicitly.

- **[JobForm] RadioCardGroup label text under-sized for touch** — `src/app/components/JobForm.tsx:55-69`. Each label is `px-4 py-2.5` ≈ 40px tall. Close but under 44. Bump to `py-3` for `min-h-[44px]`.

- **[ImageUpload] Replace button is too small** — `src/app/components/ImageUpload.tsx:80-87`. `btn-ghost text-sm px-4 py-1.5` is ~32px tall. Below 44. Increase to `py-2.5`.

- **[ImageUpload] No visible file-name / no removal flow** — On mobile there's no easy way to tell what file was selected (only an image preview, no filename or delete). Compare to `ApplyForm`'s resume row where the user gets a remove (X) button. Less critical for icons but worth aligning the patterns.

- **[ApplyForm] Aside (job summary) is huge on tablet (sm–lg)** — `src/app/show/[jobId]/apply/page.tsx:40-113`. The layout is `grid lg:grid-cols-[340px_1fr]`. Below `lg` the aside sits *above* the form, pushing the actual form below the fold for 240 px of summary content. Consider hiding the aside on `<sm:` (`hidden md:block`) or rendering a compressed inline header with just the title and orgName.

- **[ApplyForm] LinkedIn / URL inputs lack `inputMode`/`autoComplete`** — `src/app/show/[jobId]/apply/ApplyForm.tsx:316-360,452-461`. The fullName/email/phone/linkedinUrl inputs use `type=`text|email|tel|url`` (good), but no `autoComplete="name|email|tel|url"`. On mobile this prevents one-tap autofill from the keyboard. Add them: `autoComplete="name"`, `"email"`, `"tel"`, `"url"`.

- **[ApplyForm] Years-of-experience custom dropdown styling** — `src/app/show/[jobId]/apply/ApplyForm.tsx:507-523`. The native `<select>` with a custom SVG chevron is fine on iOS/Android (native picker takes over). The `appearance-none` plus a background-image chevron is ~52 chars of inline CSS — works, but verify the chevron isn't covered by the iOS dropdown arrow on top.

- **[ApplyForm] Section spacing too large** — Each `<section>` uses `space-y-12` between sections (line 239) and `SectionTitle` is `text-2xl mb-5`. On mobile this creates a very tall scroll. Reduce to `space-y-8 sm:space-y-12`.

- **[Applications list — orgId page] Right cluster squeezes title** — `src/app/jobs/[orgId]/applications/page.tsx:97-121`. The card row has title/location grow + (newCount pill + total + arrow). No `flex-wrap`. With a long job title and `2 new` + count, the title `truncate`s — but truncation isn't applied on `h2` (line 100). Add `truncate` to the h2.

- **[Application detail page] Header overflows with Mark-reviewed button** — `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx:118-144`. `flex items-start gap-5`: avatar + name (grow) + MarkReviewedButton (shrink-0). The button is `btn-primary` (`px-6 py-2.5`), name is `text-3xl`. On 375px with a long applicant name + `New` badge, the title wraps and the button hits the title. Stack on mobile: `flex-col sm:flex-row` and move the button below.

- **[Application detail Field rows] Right-aligned value clashes with label on small screens** — `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx:58-71`. `flex justify-between gap-4`: label left, value right with `text-right`. Long values like LinkedIn `View profile` work, but if a future field has long text (e.g., a custom answer), there's no wrapping plan. Acceptable but consider `flex-col sm:flex-row` for fields with multi-word values.

- **[Show job page] Apply CTA card collapses awkwardly** — `src/app/show/[jobId]/page.tsx:75-91`. Uses `sm:flex items-center justify-between` — on mobile (`<sm:`) the inner divs stack via `mt-4 sm:mt-0`, which is fine. But the `Link` button has `shrink-0` and on small `sm:` (640px) it might wrap to two lines. Add `whitespace-nowrap` to the button or use `text-sm` below `md:`.

- **[Show job page] Description has no max-width on mobile** — `src/app/show/[jobId]/page.tsx:93-95`. `whitespace-pre-line text-gray-700 leading-relaxed` inside `container max-w-3xl`. Acceptable, but long paragraphs without `prose` styling can feel dense. Consider `text-base sm:text-lg` for readability on mobile.

- **[Show job page] Header avatar + title row** — `src/app/show/[jobId]/page.tsx:34-73`. `flex items-start gap-5` with avatar `size-16` (64px) + title `text-4xl sm:text-5xl`. On iPhone SE the available title width is ~327 - 64 - 20 = 243px. A 36px (text-4xl) heading at that width can wrap a 50-character title to 4 lines. Drop to `text-3xl sm:text-5xl`.

- **[NewListing page] Promo card layout collapses awkwardly** — `src/app/new-listing/page.tsx:80-98`. The gradient outer + inner `sm:flex items-center justify-between` again uses `mt-4 sm:mt-0` on the button. The h3 `text-2xl` "Hiring for a new company?" plus the button "Create a new company" (long label) both stretch wide on mobile. Make the button full-width on `<sm:` and consider shortening the label or icon-only.

- **[NewCompany page] Submit button is right-aligned on mobile** — `src/app/new-company/page.tsx:45-49`. `flex justify-end` with a single input above. Make button `w-full sm:w-auto`.

- **[Success page / Not-found pages] Buttons in row may wrap poorly** — `src/app/show/[jobId]/apply/success/page.tsx:25-32`, `src/app/not-found.tsx`. Two pill buttons `gap-3` on mobile — fits on 375px but tight. Add `flex-col sm:flex-row` for extra safety.

- **[Layout footer]** — `src/app/layout.tsx:42-49`. Already uses `flex-col sm:flex-row` — good. `mt-24` is excessive on mobile; reduce to `mt-12 sm:mt-24`.

---

## Medium Priority (P2 — polish)

- **[Header] Backdrop blur may hurt perf on low-end Android** — `src/app/components/Header.tsx:9` uses `backdrop-blur-md`. Negligible on iOS but can stutter on cheap Android. Acceptable trade-off.

- **[Header] `bg-white/85`** with backdrop-blur may show ghosting on light pages — `src/app/components/Header.tsx:9`. Acceptable.

- **[Hero] `size-[600px]` background blob renders 600×600 even on tiny phones** — `src/app/components/Hero.tsx:9`. Wasteful pixels. Use `size-[400px] sm:size-[600px]`.

- **[Hero] Search input + autofocus** — `src/app/components/Hero.tsx:42-48`. Consider `inputMode="search"` (already implicit via `type="search"`) and `autoCapitalize="off"` to avoid first-letter capitalization on mobile.

- **[Jobs page] Filter `Apply` button anchored bottom-right of card** — `src/app/jobs/page.tsx:214-228`. On mobile a sticky bottom Apply bar would be nicer than scrolling back up.

- **[JobRow] Truncation on org name** — `src/app/components/JobRow.tsx:74-79`. Long orgs e.g. "International Business Machines Corporation" won't truncate on the eyebrow line. Add `truncate block max-w-full`.

- **[JobRow] Date alignment shifts when no admin actions** — `src/app/components/JobRow.tsx:135-139`. When `isAdmin` is false the actions div is empty but still rendered, then `TimeAgo` floats `ml-auto`. Looks OK but technically wastes a flex row. Conditionally render the wrapper.

- **[JobForm] `space-y-10` between sections** — `src/app/components/JobForm.tsx:120`. Could be tighter on mobile. `space-y-8 sm:space-y-10`.

- **[JobForm] Country/state/city placeholder text might not show clearly** — Library defaults. Verify visually.

- **[ApplyForm] `space-y-12` between sections** — Already mentioned P1. The radio pills `grid-cols-2 sm:grid-cols-3` (line 106) work, but on a 320px viewport two pills + gap fit ok; verify.

- **[ApplyForm] Voluntary disclosures section labels wrap** — `src/app/show/[jobId]/apply/ApplyForm.tsx:534-569`. Three identical `RadioPills` with `decline to self-identify` (long label) — on `grid-cols-2` (<sm:) the third pill takes the second row alone, with two-line wrap on "Decline to self-identify". Tighten to `text-xs sm:text-sm` and `px-3` on mobile.

- **[ApplyForm] Why-join textarea char counter is right-aligned** — `src/app/show/[jobId]/apply/ApplyForm.tsx:493-496`. Fine, but on iOS in landscape with the keyboard up the counter is hidden by the bottom bar. Minor.

- **[Show job page] Contact card layout on mobile** — `src/app/show/[jobId]/page.tsx:101-135`. `flex items-start gap-4` with `size-16` photo + grow content. Email/phone links are `flex items-center gap-2 text-sm` — touch target only ~24px tall. Bump to `py-2`.

- **[Show job page] mailto:/tel: links on mobile are 100% expected** — Confirm they trigger native dialer/mail. Both attributes set correctly.

- **[Applications list — list item] No mobile-specific time format** — `src/app/jobs/[orgId]/applications/[jobId]/page.tsx:128-130`. TimeAgo is `hidden sm:block`. Below `sm:` users can't see when the application arrived — only on the detail page. Show a compact relative date inline (e.g., `2d`) instead of hiding entirely.

- **[Application detail page] `flex justify-between` `Field` rows on mobile** — Already covered. Minor.

- **[Application detail page] Resume download button is full-width** — `src/app/jobs/[orgId]/applications/[jobId]/[applicationId]/page.tsx:176-193`. Good. But `inline-flex` on an `a` with no `w-full` means it sizes to content. On mobile a `w-full sm:w-auto` would be a bigger target. Optional.

- **[NewListing] Org list item touch target** — `src/app/new-listing/page.tsx:47-65`. `card p-4` = ~16px padding around 40px avatar = 72px tall card. Good touch target.

- **[NewCompany] Input could include `autoComplete="organization"`** — `src/app/new-company/page.tsx:34-43`.

- **[Loading/Error/NotFound]** — All use `py-24`. Reduce to `py-16 sm:py-24` to remove dead space on mobile.

- **[NoAccess component] Same — `py-24` is excessive on mobile** — `src/app/components/NoAccess.tsx:3`. Reduce.

- **[Sticky header obstruction]** — Header height ~64px. Most pages use `py-12` or `py-16` top padding, so content has clearance. The `scroll-mt-24` on `Jobs.tsx:12` is appropriate for `#jobs` anchor scrolling.

---

## Low Priority (P3 — nice to have)

- **[Global] No `viewport` meta export** — `src/app/layout.tsx:26-30`. Add:
  ```ts
  export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#4A7C59' };
  ```

- **[Global] Tap highlight color** — Add `-webkit-tap-highlight-color: transparent` in `src/app/globals.css` to remove iOS's default grey flash on link taps, or set a swamp-tinted color: `-webkit-tap-highlight-color: rgba(74, 124, 89, 0.15)`.

- **[Global] `select` and `input` zoom prevention** — `src/app/globals.css:48-54`. Set `input, select, textarea { font-size: 16px; }` at base on `<sm:` to guarantee no iOS zoom.

- **[Hero] Decorative dot in `now hiring — quietly`** — `src/app/components/Hero.tsx:14-17`. Fine.

- **[Jobs page] `formKey` debounce search** — Server form re-submits on every filter change because all checkboxes/inputs share one form. On mobile, users uncheck/re-check more often. Optional: client-side filter with `useDeferredValue`.

- **[JobRow] FA Icon `size-3` (12px) inside `text-xs` pill is hard to scan** — `src/app/components/JobRow.tsx:114,121,129`. Bump to `size-3.5`.

- **[JobForm] `Country/state/city` cascading selects don't show loading state** — Library limitation. Acceptable.

- **[ApplyForm] Drag/drop area on mobile** — Already noted in P0. Alternative copy "Tap to upload" is the smallest change.

- **[ApplyForm] Autofill state colors and icon swap** — `src/app/show/[jobId]/apply/ApplyForm.tsx:247-260`. The error state changes the icon color via `text-red-500` but the parent always has `text-swamp-500`, so the cascade depends on class order. Works in Tailwind because the latter class wins, but explicit `text-red-500 [&]:text-red-500` is safer.

- **[Application list] Avatar initial is a great fallback** — `src/app/jobs/[orgId]/applications/[jobId]/page.tsx:105-107`. Good UX.

- **[Show job page] Apply CTA in the middle of the page** — Consider a sticky-bottom Apply button on mobile (`sm:hidden fixed bottom-0 inset-x-0 p-4 bg-white border-t`) so users don't have to scroll back up after reading the description.

- **[All pages] Empty state cards use `p-12`** — Reduce to `p-8 sm:p-12` on mobile.

- **[Layout] `min-h-screen flex flex-col`** — Already correct.

- **[Layout] `footer mt-24`** — Already noted in P1.

- **[Show/apply success] CTAs side-by-side wrap risk** — Covered.

- **[Show/apply/not-found] 404 page** — `py-24` reduce on mobile.

- **[Container padding]** — `tailwind.config.ts` defines `DEFAULT: 1.5rem` (24px) for the container. Could go to `1rem` (16px) on `<sm:` to claim a bit more width. Trade-off: feels more crowded.

- **[Animation] `animate-fade-up`** — `src/app/components/Hero.tsx:13,20,26,34`. Respect `prefers-reduced-motion`. Add a media-query in `globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-up { animation: none; opacity: 1; }
  }
  ```

- **[Typography] Font-serif Instrument_Serif at small sizes** — Decorative typeface, but readable. No action.

- **[Color contrast] `text-gray-400` on white** — Used for eyebrows, captions, counts. Contrast ratio ~3.2:1 — fails WCAG AA for body text but is acceptable for `text-xs` decorative labels. Fine.

- **[Icons-only states] Sign out is a text button** — Could become an icon on mobile to save space. Tied to header redesign.

---

## Suggested fix priority for a single mobile-polish PR

If you only have time for one pass, do P0 items 1, 2, 5, 6, 7, 8, 12 — they make the difference between "broken on mobile" and "usable on mobile":
1. Header: add mobile menu + responsive right cluster.
2. Hero: shrink H1 + stack search form.
3. JobForm: stack contact-person row, fix select widths.
4. ApplyForm: stack autofill CTA row.
5. Jobs page: make filter sidebar a collapsible disclosure on `<lg:`.
6. Global: add `viewport` export + 16px input base to kill iOS zoom + reduced-motion guard.
