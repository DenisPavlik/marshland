/**
 * Seed script — populates the marshland job board with 15 realistic IT roles
 * across well-known companies. Useful for local dev and screenshots.
 *
 * Reads from .env:
 *   MONGO_URI        — MongoDB connection string (the codebase uses this name,
 *                      not MONGODB_URI). Required.
 *   WORKOS_API_KEY   — WorkOS API key. Required, because each job needs an
 *                      orgId that resolves through WorkOS for `orgName`.
 *
 * The script is idempotent on WorkOS organizations: on each run it lists
 * existing orgs first and reuses any whose name already matches. Jobs, however,
 * are inserted fresh each time — so running twice gives you 30 jobs.
 *
 * Run:
 *   pnpm seed
 *
 * Or directly:
 *   pnpm tsx src/scripts/seed.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { WorkOS } from "@workos-inc/node";
import { JobModel } from "../models/Job";

if (!process.env.MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}
if (!process.env.WORKOS_API_KEY) {
  console.error("Missing WORKOS_API_KEY in .env");
  process.exit(1);
}

type JobSpec = {
  company: string;
  title: string;
  remote: "onsite" | "hybrid" | "remote";
  type: "full" | "part" | "project";
  salary: number;
  country: string;
  state: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
};

const JOBS: JobSpec[] = [
  {
    company: "Apple",
    title: "Senior iOS Engineer",
    remote: "hybrid",
    type: "full",
    salary: 220,
    country: "United States",
    state: "California",
    city: "Cupertino",
    contactName: "Sarah Chen",
    contactEmail: "ios-jobs@apple.com",
    contactPhone: "+1 (408) 555-0142",
    description: `We're hiring a Senior iOS Engineer to join the team behind one of Apple's most-used consumer apps. You'll work directly with designers, product managers, and other engineers to ship features that touch millions of people every day. The role is hybrid out of Cupertino, with three days a week in the office.

Your work will span the entire stack of iOS development — from low-level Swift performance tuning to building delightful, accessible UI in SwiftUI. We care a lot about the details: animation curves, haptic feedback, energy efficiency, and how the app feels in someone's hand. You'll own significant areas of the codebase and mentor engineers earlier in their careers.

We're looking for someone with 6+ years of professional iOS experience, deep familiarity with Swift, and a real love for craft. Bonus points for past contributions to open-source iOS projects, experience with accessibility, or background in mobile performance work.

Apple is an equal opportunity employer. We celebrate the diverse backgrounds and perspectives our employees bring.`,
  },
  {
    company: "Google",
    title: "Staff Backend Engineer",
    remote: "hybrid",
    type: "full",
    salary: 310,
    country: "United States",
    state: "California",
    city: "Mountain View",
    contactName: "Marcus Williams",
    contactEmail: "careers@google.com",
    contactPhone: "+1 (650) 555-0167",
    description: `Google's Search infrastructure team is hiring a Staff Backend Engineer to help scale the systems that power billions of queries every day. You'll work on distributed databases, query latency optimization, and the next generation of indexing architecture.

This role sits at the intersection of distributed systems and product impact. Your decisions about caching, sharding, and failure modes will shape how Search performs for users worldwide. Expect to design systems that handle massive scale while keeping P99 latency in the low milliseconds.

We're looking for 10+ years of backend engineering experience, deep expertise in distributed systems, and a track record of leading multi-team technical initiatives. Strong fundamentals in algorithms, networking, and storage are a must. Open-source contributions to distributed systems projects are a plus.

Google is committed to building an inclusive workplace. We welcome candidates from all backgrounds.`,
  },
  {
    company: "Meta",
    title: "ML Engineer, Recommendations",
    remote: "onsite",
    type: "full",
    salary: 280,
    country: "United States",
    state: "California",
    city: "Menlo Park",
    contactName: "Priya Patel",
    contactEmail: "ai-hiring@meta.com",
    contactPhone: "+1 (650) 555-0188",
    description: `Meta's AI team is looking for an ML Engineer to help push the boundaries of foundation models for recommendation systems. You'll work alongside researchers and product engineers to take models from prototype to production at Meta scale.

The role spans the full ML lifecycle: dataset curation, model architecture experimentation, distributed training, and serving infrastructure. You'll iterate quickly using internal tooling and have direct impact on what billions of people see in their feeds.

We're looking for an MS or PhD in CS/ML, or 5+ years of professional ML engineering experience. Strong PyTorch skills, experience with large-scale distributed training (multi-node, mixed precision), and the ability to read recent ML papers and turn them into working code.

Onsite in Menlo Park. Relocation support available for the right candidate.`,
  },
  {
    company: "Microsoft",
    title: "DevOps Engineer, Azure Platform",
    remote: "remote",
    type: "full",
    salary: 190,
    country: "United States",
    state: "Washington",
    city: "Redmond",
    contactName: "David Kim",
    contactEmail: "azure-jobs@microsoft.com",
    contactPhone: "+1 (425) 555-0119",
    description: `Azure DevOps is hiring a senior DevOps Engineer to join the platform reliability team. You'll be responsible for the CI/CD pipelines, deployment infrastructure, and incident response systems that thousands of engineering teams across Microsoft depend on.

Day to day, you'll work on Kubernetes operators, GitHub Actions integrations, and the observability stack (Prometheus, Grafana, OpenTelemetry). You'll also rotate through on-call duty for the platform, with strong runbook tooling and a blameless postmortem culture.

We're looking for 5+ years of DevOps/SRE experience, deep Kubernetes knowledge, and comfort with infrastructure-as-code (Terraform, Bicep). Experience operating large-scale Azure environments is a plus but not required.

Fully remote within the US. Microsoft offers a generous benefits package including equity and unlimited PTO.`,
  },
  {
    company: "NVIDIA",
    title: "Platform Engineer, Developer Tools",
    remote: "onsite",
    type: "full",
    salary: 260,
    country: "United States",
    state: "California",
    city: "Santa Clara",
    contactName: "Elena Rodriguez",
    contactEmail: "platform-careers@nvidia.com",
    contactPhone: "+1 (408) 555-0173",
    description: `NVIDIA's developer platform team is hiring a Platform Engineer to help build the tools and infrastructure that GPU developers use every day. From driver SDKs to the CUDA ecosystem, your work will accelerate computing for researchers, game developers, and enterprises worldwide.

You'll architect internal services, contribute to the CUDA toolkit, and partner with hardware teams to design APIs that take full advantage of the latest GPU architectures. Expect to write a lot of C++ and contend with cross-platform compatibility (Linux, Windows, macOS).

7+ years of systems engineering experience, expert-level C++, and a passion for performance. Bonus if you've worked on compiler toolchains, parallel computing, or graphics programming.

Onsite at our Santa Clara HQ. Strong compensation including significant equity grants.`,
  },
  {
    company: "Stripe",
    title: "Frontend Engineer, Dashboard",
    remote: "remote",
    type: "full",
    salary: 200,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "James O'Brien",
    contactEmail: "hiring@stripe.com",
    contactPhone: "+1 (415) 555-0156",
    description: `Stripe's Dashboard team is hiring a senior Frontend Engineer to shape how millions of businesses interact with their payments data. You'll work on the financial workflows, reporting tools, and admin surfaces that power Stripe users daily.

We care deeply about craft. Expect to spend time on accessibility, performance budgets, and the kind of UI polish that makes the Dashboard feel fast and trustworthy. You'll work closely with designers using our internal component library and contribute back to it.

5+ years of frontend engineering, expert React/TypeScript, and demonstrated experience with complex data-dense interfaces. Familiarity with money, accounting, or payments domains is a plus.

Remote within the US, or in our San Francisco HQ. Stripe offers strong benefits, including health, wellness, and learning stipends.`,
  },
  {
    company: "Netflix",
    title: "Senior Backend Engineer, Recommendations",
    remote: "hybrid",
    type: "full",
    salary: 400,
    country: "United States",
    state: "California",
    city: "Los Gatos",
    contactName: "Aisha Johnson",
    contactEmail: "jobs@netflix.com",
    contactPhone: "+1 (408) 555-0134",
    description: `Netflix is hiring a Senior Backend Engineer to join the team behind our content recommendation systems. You'll work on services that handle billions of requests daily, blending real-time personalization with large-scale ML inference.

The role involves designing high-throughput Java services, working with our microservice ecosystem (we have hundreds of them), and partnering with data engineering on the recommendation pipelines. You'll also have significant ownership over architectural decisions in your domain.

8+ years of backend engineering experience, deep Java/JVM knowledge, and comfort with large-scale distributed systems. Experience with recommender systems or real-time ML serving is a plus.

Hybrid out of our Los Gatos HQ. Top-of-market compensation, with the well-known Netflix culture of high freedom and high responsibility.`,
  },
  {
    company: "Spotify",
    title: "Design Engineer, Web",
    remote: "hybrid",
    type: "full",
    salary: 180,
    country: "United States",
    state: "New York",
    city: "New York",
    contactName: "Lucas Bergman",
    contactEmail: "design-eng@spotify.com",
    contactPhone: "+1 (212) 555-0148",
    description: `Spotify's Design Engineering team sits between product designers and software engineers. We're hiring a Design Engineer to help bring our most ambitious visual concepts to life on the web — from new home-screen experiences to interactive editorial pieces.

You'll prototype quickly using React, work with the design team to refine motion and interaction, and ship production code that delights millions. Expect to spend time on Lottie animations, WebGL shaders, and the kind of detail work that's hard to find anywhere else.

5+ years of frontend experience with a portfolio showing strong design sensibility. Comfort with motion design, animation libraries (Framer Motion, GSAP), and CSS-in-JS approaches. Visual design experience or formal training is a plus.

Hybrid out of our New York office. We offer strong music perks too.`,
  },
  {
    company: "GitHub",
    title: "Staff Engineer, Actions",
    remote: "remote",
    type: "full",
    salary: 250,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Maya Singh",
    contactEmail: "staff-hiring@github.com",
    contactPhone: "+1 (415) 555-0162",
    description: `GitHub Actions is hiring a Staff Engineer to lead architectural work across our CI/CD platform. You'll set the technical direction for a multi-team effort, work with product on long-term roadmaps, and write the high-impact code that anchors major releases.

The role is broad: you might be reviewing RFCs in the morning, debugging a Kubernetes scheduling issue at lunch, and writing a benchmark for our new runner architecture in the afternoon. You'll have significant autonomy and high expectations for technical leadership.

10+ years of professional engineering experience, prior staff/principal experience at a fast-growing engineering org, and deep familiarity with distributed systems or developer tools. Comfortable with Go is preferred.

Fully remote globally. GitHub offers excellent benefits and a strong remote work culture.`,
  },
  {
    company: "Vercel",
    title: "Product Engineer",
    remote: "remote",
    type: "full",
    salary: 220,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Tom Hayes",
    contactEmail: "careers@vercel.com",
    contactPhone: "+1 (415) 555-0181",
    description: `Vercel is hiring a Product Engineer to ship features end-to-end across our deployment platform. You'll own product areas from design through implementation, working closely with our designers and PMs (when we have them) to build things developers love.

A typical week: scoping a new feature with the team Monday, prototyping it in Next.js Tuesday, shipping behind a feature flag Wednesday, iterating on feedback Thursday, watching adoption metrics Friday. Vercel runs lean and we move fast.

5+ years of engineering experience with strong product instincts. Deep Next.js and TypeScript. Comfort with both frontend and backend. You should be a generalist who has shipped meaningful products before.

Fully remote. We bias toward written communication and async work.`,
  },
  {
    company: "Linear",
    title: "Frontend Engineer, Editor",
    remote: "remote",
    type: "full",
    salary: 200,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Anna Müller",
    contactEmail: "hiring@linear.app",
    contactPhone: "+1 (415) 555-0193",
    description: `Linear is hiring a Frontend Engineer to work on the editor and workflow systems that power our issue tracker. You'll spend most of your time in deeply interactive UI — keyboard shortcuts, drag-and-drop, real-time collaboration, the works.

We care about performance to an unusual degree. Linear should feel like a native app, even though it runs in the browser. You'll work on virtualized lists, optimistic updates, and the kind of micro-interactions that make our users happy.

5+ years of frontend engineering, expert React and TypeScript, and strong performance intuition. Experience building rich text editors (ProseMirror, Slate, Lexical), real-time collaboration (CRDTs), or design tools is a strong plus.

Remote anywhere in compatible time zones. Linear is small, focused, and well-funded.`,
  },
  {
    company: "Figma",
    title: "Design Engineer, Brand",
    remote: "hybrid",
    type: "full",
    salary: 230,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Carlos Mendez",
    contactEmail: "design-jobs@figma.com",
    contactPhone: "+1 (415) 555-0127",
    description: `Figma is hiring a Design Engineer to join our Brand and Marketing Engineering team. You'll prototype and ship marketing experiences, landing pages, and interactive product demos that translate Figma into something compelling on the web.

The role is split between exploration and shipping. One day you might prototype a new animated hero with our brand team; the next, optimize a launch page for conversion. You'll have access to the full Figma file library and partner directly with our design team.

4+ years of frontend engineering with a strong design portfolio. Expert HTML/CSS, JavaScript/TypeScript, and animation libraries. Comfort with Figma the product (obviously) and modern design tooling.

Hybrid out of our San Francisco office. Figma offers excellent benefits and a creative, collaborative culture.`,
  },
  {
    company: "Notion",
    title: "Backend Engineer, Sync Infrastructure",
    remote: "hybrid",
    type: "full",
    salary: 210,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Hannah Park",
    contactEmail: "sync-careers@notion.so",
    contactPhone: "+1 (415) 555-0145",
    description: `Notion's Sync Infrastructure team is hiring a senior Backend Engineer to work on the systems that power real-time collaboration across hundreds of millions of pages. You'll work on conflict resolution, offline-first sync, and the database architecture that anchors our product.

Expect deep technical work: CRDTs, distributed transactions, postgres performance tuning, and high-availability operations. Notion's data model is unusual (everything is a block), which makes for interesting problems and high-impact decisions.

6+ years of backend engineering experience, expert PostgreSQL and distributed systems, and a deep curiosity about consistency models. Experience with collaborative software (Google Docs, Notion, Figma, Linear) is a plus.

Hybrid out of our San Francisco office. Notion offers competitive compensation including significant equity.`,
  },
  {
    company: "OpenAI",
    title: "ML Engineer, Post-training",
    remote: "onsite",
    type: "full",
    salary: 370,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Robert Chen",
    contactEmail: "ml-hiring@openai.com",
    contactPhone: "+1 (415) 555-0158",
    description: `OpenAI is hiring an ML Engineer to join the post-training team. You'll work on the fine-tuning, RLHF, and evaluation infrastructure that turns our base models into the assistants people interact with via ChatGPT and the API.

The role spans research-engineering: designing experiments, scaling training pipelines, evaluating models against complex benchmarks, and partnering with researchers to ship improvements. Expect a fast-paced environment with high autonomy and significant impact.

PhD in ML/CS or equivalent practical experience. Deep PyTorch, distributed training, and ML systems. Experience with RLHF, fine-tuning, or alignment work is a strong plus.

Onsite at our Mission Bay HQ in San Francisco. OpenAI offers competitive compensation and meaningful equity.`,
  },
  {
    company: "Anthropic",
    title: "Platform Engineer, Inference",
    remote: "hybrid",
    type: "full",
    salary: 280,
    country: "United States",
    state: "California",
    city: "San Francisco",
    contactName: "Emily Foster",
    contactEmail: "careers@anthropic.com",
    contactPhone: "+1 (415) 555-0179",
    description: `Anthropic is hiring a Platform Engineer to help scale the infrastructure that runs Claude. You'll work on training and inference systems, model serving, and the developer tools that researchers and engineers across the company use every day.

The role is high-impact and broad. Expect to design Kubernetes-based inference clusters, optimize GPU utilization, and partner with the research org on training runs that push the limits of what's possible. Anthropic moves fast and ships often.

7+ years of platform/infra engineering, deep Kubernetes expertise, and experience with ML infrastructure or GPU-heavy workloads. Comfort with Python (for tooling) and a service-oriented mindset.

Hybrid out of our San Francisco HQ. Anthropic offers strong compensation, generous benefits, and the chance to work on AI safety with people who care deeply about the work.`,
  },
];

async function ensureOrgs(
  workos: WorkOS,
  companies: string[]
): Promise<Record<string, string>> {
  console.log("Listing existing WorkOS organizations…");
  const existing = await workos.organizations.listOrganizations({ limit: 100 });
  const byName = new Map<string, string>();
  for (const org of existing.data) {
    byName.set(org.name, org.id);
  }

  const result: Record<string, string> = {};
  for (const name of companies) {
    const existingId = byName.get(name);
    if (existingId) {
      console.log(`  ✓ ${name} (existing)`);
      result[name] = existingId;
    } else {
      const org = await workos.organizations.createOrganization({ name });
      console.log(`  + ${name} (created)`);
      result[name] = org.id;
    }
  }
  return result;
}

async function main() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI as string);

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const companies = Array.from(new Set(JOBS.map((j) => j.company)));
  const orgIdByCompany = await ensureOrgs(workos, companies);

  console.log(`\nInserting ${JOBS.length} jobs…`);
  for (const spec of JOBS) {
    const orgId = orgIdByCompany[spec.company];
    if (!orgId) {
      console.warn(`  ⚠ Skipping ${spec.title} — no orgId for ${spec.company}`);
      continue;
    }
    const job = await JobModel.create({
      title: spec.title,
      description: spec.description,
      remote: spec.remote,
      type: spec.type,
      salary: spec.salary,
      country: spec.country,
      state: spec.state,
      city: spec.city,
      countryId: "0",
      stateId: "0",
      cityId: "0",
      orgId,
      contactName: spec.contactName,
      contactEmail: spec.contactEmail,
      contactPhone: spec.contactPhone,
    });
    console.log(`  ✓ ${spec.company} — ${spec.title} (${String(job._id)})`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
