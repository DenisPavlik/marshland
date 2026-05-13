<div align="center">

# 🌿 Marshland

### A focused job board for engineers who care about craft. Built quietly in the swamp.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WorkOS](https://img.shields.io/badge/Auth-WorkOS-6363F1?logo=workos&logoColor=white)](https://workos.com/)
[![Anthropic](https://img.shields.io/badge/AI-Claude%20Haiku%204.5-D97757)](https://www.anthropic.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

</div>

---

## 📖 About

**Marshland** is a full-stack hiring platform where companies post openings and candidates apply in one click. Built around real multi-tenant authentication, S3-backed media uploads, and an AI-powered resume parser that fills out application forms for you.

Designed for **founders, recruiters, and engineers who hate retyping the same five fields into every form on the internet**, Marshland turns a classic CRUD job board into something that feels modern, fast, and a little magical.

---

## ✨ Key Features

- 🏢 **Multi-tenant organizations** — spin up a company, invite teammates, post jobs under your org
- 🔐 **Production-grade auth** — WorkOS AuthKit handles users, sessions, orgs, memberships, and roles
- 📝 **Rich job listings** — title, description, type, remote/hybrid/on-site, salary, cascading country/state/city
- 🖼️ **S3 media uploads** — job icons, contact photos, candidate resumes — all streamed to AWS
- 🔎 **Public browsing with filters** — phase, employment type, remote — plus dedicated company pages
- 🤖 **AI resume autofill** — drop a PDF, watch the form fill itself (more below 👇)
- 📥 **Admin application inbox** — every applicant for every job, with `new` / `reviewed` states
- 🌍 **Cascading location selects** — country → state → city, with IDs persisted for clean rehydration
- ⚡ **Server Actions + Route Handlers** — Next.js 14 App Router, the modern way
- 📱 **Responsive UI** — Tailwind, looks crisp on mobile and desktop

---

## 🤖 The AI Resume Autofill (the fun part)

The apply flow has one job: get candidates to **stop retyping their resume into a form**.

Here's the magic trick:

1. 📎 Candidate drops a PDF resume on the apply page
2. ☁️ PDF is uploaded to S3 via `POST /api/upload-resume` and the public URL lands in form state
3. 🧠 The same PDF is base64-encoded and shipped to `parseResumeAction`, a Next.js Server Action
4. 🪄 Claude **Haiku 4.5** (`claude-haiku-4-5-20251001`) receives the PDF as a native `document` content block — no OCR, no preprocessing
5. 🔧 Extraction runs through **tool use**: the model is forced to call exactly one tool (`save_parsed_resume`) whose `input_schema` defines every field and enum the form expects
6. ✅ Result: clean, schema-valid JSON straight back to the UI — no regex, no string parsing, no hallucinated phone numbers
7. ✏️ The candidate still reviews and edits every field before submitting

The system prompt explicitly tells the model **to omit any field it can't extract with high confidence**. Better an empty input than a wrong one.

> Code: [`src/app/actions/parseResumeAction.ts`](src/app/actions/parseResumeAction.ts)

---

## 🛠️ Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| **Framework**    | Next.js 14 (App Router, Server Actions, Route Handlers)       |
| **UI**           | React 18, Tailwind CSS 3, FontAwesome                         |
| **Language**     | TypeScript 5                                                  |
| **Database**     | MongoDB + Mongoose 8                                          |
| **Auth & Orgs**  | WorkOS AuthKit + Organizations API                            |
| **AI**           | Anthropic API — Claude Haiku 4.5 with tool use                |
| **File Storage** | AWS S3 (`@aws-sdk/client-s3`)                                 |
| **Geo Data**     | `react-country-state-city` — cascading country/state/city     |
| **Package Mgr**  | pnpm                                                          |

---

## 🏛️ Architecture at a Glance

Two persistence boundaries live side by side and stay in sync:

- 🍃 **MongoDB** owns the things the app generates — `Job` and `Application` documents
- 🔑 **WorkOS** owns identity — users, organizations, memberships, roles
- 🔗 Jobs carry only an `orgId`; company name and "am I admin?" are hydrated on read

Other moving parts:

- 🛡️ `src/middleware.ts` runs `authkitMiddleware()` on an allowlist (`/`, `/new-listing*`, `/new-company`, `/jobs/*`, `/show/*`)
- ✍️ Server Actions handle writes (`saveJobAction`, `createCompany`, `submitApplicationAction`, `parseResumeAction`)
- 🗑️ Deletes go through a single HTTP route — `DELETE /api/jobs?id=...`
- 📤 Uploads stream to S3 with `uniqid()`-prefixed keys and return public URLs

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** and **pnpm**
- A **MongoDB** connection string (local or hosted — Atlas, Railway, etc.)
- A **WorkOS** account with AuthKit + Organizations enabled
- An **AWS S3** bucket and IAM credentials
- An **Anthropic API key** (optional — autofill simply disables if missing)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/DenisPavlik/marshland.git
cd marshland

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# then edit .env with your credentials (see table below)

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live.

### Build for production

```bash
pnpm build
pnpm start
```

### Scripts

| Command       | What it does                              |
| ------------- | ----------------------------------------- |
| `pnpm dev`    | Run Next.js dev server on port 3000       |
| `pnpm build`  | Production build                          |
| `pnpm start`  | Serve the production build                |
| `pnpm lint`   | Lint with `next lint` / ESLint            |
| `pnpm seed`   | Seed the database (`src/scripts/seed.ts`) |

---

## 🔐 Environment Variables

Create a `.env` file at the project root with the following values:

| Variable                  | Required | Description                                                                                  |
| ------------------------- | :------: | -------------------------------------------------------------------------------------------- |
| `MONGO_URI`               |    ✅    | MongoDB connection string used by Mongoose                                                   |
| `WORKOS_CLIENT_ID`        |    ✅    | WorkOS client ID                                                                             |
| `WORKOS_API_KEY`          |    ✅    | WorkOS server-side API key                                                                   |
| `WORKOS_REDIRECT_URI`     |    ✅    | OAuth callback — e.g. `http://localhost:3000/api/auth/callback`                              |
| `WORKOS_COOKIE_PASSWORD`  |    ✅    | 32+ char secret used by AuthKit to encrypt the session cookie                                |
| `S3_ACCESS_KEY`           |    ✅    | AWS access key ID for the S3 bucket                                                          |
| `S3_SECRET_ACCESS_KEY`    |    ✅    | AWS secret access key                                                                        |
| `ANTHROPIC_API_KEY`       |    ⚪    | Anthropic API key for resume autofill — leave unset to disable the AI flow                   |

> The S3 bucket name (`denys-job-board`) and region (`us-east-1`) are currently hardcoded in `src/app/api/upload/route.ts` and `src/app/api/upload-resume/route.ts`. Fork-and-rename if you're deploying your own copy. The bucket hostname is also allow-listed in `next.config.mjs` for `next/image`.

---

## 🗂️ Project Layout

```
src/
├── app/
│   ├── actions/          # 'use server' write paths (jobs, companies, applications, resume parsing)
│   ├── api/              # Route handlers (auth callback, uploads, job delete, applications)
│   ├── components/       # UI components (JobForm, ApplyForm, FiltersAside, Header, ...)
│   ├── jobs/             # /jobs, /jobs/[orgId], /jobs/[orgId]/applications, /jobs/edit/[jobId]
│   ├── new-company/      # Create a WorkOS organization
│   ├── new-listing/      # Create a job (per org)
│   └── show/[jobId]/     # Public job detail + /apply flow
├── models/               # Mongoose schemas (Job, Application)
├── lib/                  # Shared helpers
└── middleware.ts         # AuthKit middleware + route matcher
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built quietly in the swamp 🌿 with ☕, ✨, and an unhealthy enthusiasm for shipping side projects.

</div>
