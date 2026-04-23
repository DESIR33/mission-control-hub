# Mission Control Hub (Desmily)

An all-in-one operations platform for creators. Mission Control Hub brings
content planning, YouTube analytics, subscriber management, CRM, finance,
tasks, email, and an AI memory/assistant layer into a single workspace so a
one-person creator business can be run from one dashboard.

Tagline: *Manage your creator business in one place.*

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Supabase (database & edge functions)](#supabase-database--edge-functions)
- [Memory client package](#memory-client-package)
- [Testing & linting](#testing--linting)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

The app is organised into feature areas, each available as a section of the
sidebar. High-level modules:

- **Dashboard / Daily Briefing** — personalised daily overview of what needs
  attention across all modules.
- **Content Pipeline** — video queue, content projects, trend scanner, and
  idea intake.
- **YouTube Hub** — channel analytics, video-level insights, comments, growth
  forecasting, competitor stats, and viral playbooks.
- **Growth** — forecasts, experiments, sprint planning, and weekly reports.
- **Finance** — revenue overview, expense tracker, sponsorship/affiliate
  tracking, product transactions, invoicing, and tax-deductibility review.
- **Network / CRM** — companies, contacts, deals, collaborations, sponsor
  discovery, and enrichment.
- **Subscribers** — list, dashboard, guide delivery, and email sequences
  (integrates with Beehiiv).
- **Inbox** — unified email triage with auto-labelling, classification, and
  automation rules (Outlook integration).
- **Tasks** — inbox/board/calendar/project/space views for task management.
- **AI Hub** — conversational assistant, proposal generator, and autonomous
  agents (orchestrator + proactive runners).
- **Memory System** — long-term memory capture, extraction, scoping,
  consolidation, conflict detection, semantic search, knowledge graph,
  analytics, and digests.
- **Integrations** — Outlook, YouTube, Stripe, Slack, Beehiiv, and custom
  document ingest.
- **Operations Center** — cross-module health, scoring, and status.
- **Settings** — profile, workspace, feature toggles, and integration config.

See `FEATURE_CONSOLIDATION_ANALYSIS.md` and `GROWTH_ROADMAP.md` in the repo
root for deeper product notes, and `docs/` for additional design docs.

---

## Tech stack

**Frontend**
- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) +
  [TypeScript](https://www.typescriptlang.org/)
- [React Router v6](https://reactrouter.com/) (lazy-loaded routes)
- [TanStack Query](https://tanstack.com/query) for server state
- [TanStack Virtual](https://tanstack.com/virtual) for large lists
- [Tailwind CSS](https://tailwindcss.com/) +
  [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- [Framer Motion](https://www.framer.com/motion/) for animation
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- [Recharts](https://recharts.org/) for charts
- [@xyflow/react](https://reactflow.dev/) + [dagre](https://github.com/dagrejs/dagre)
  for the memory knowledge graph
- [react-markdown](https://github.com/remarkjs/react-markdown) +
  [DOMPurify](https://github.com/cure53/DOMPurify) for safe markdown rendering
- [jsPDF](https://github.com/parallax/jsPDF) + [JSZip](https://stuk.github.io/jszip/)
  for exports

**Backend**
- [Supabase](https://supabase.com/) — Postgres, auth, storage, realtime, and
  edge functions (Deno). ~170 migrations, ~85 edge functions.
- Edge functions cover AI proxying, YouTube/Outlook/Stripe/Beehiiv sync,
  memory processing, agent orchestration, inbox automation, and more.

**Tooling**
- [Vitest](https://vitest.dev/) + Testing Library for tests
- ESLint 9 + typescript-eslint
- [Bun](https://bun.sh/) lockfile is present; npm also works

---

## Repository layout

```
.
├── src/                      # React application
│   ├── components/           # Feature + shared UI components
│   ├── pages/                # Route-level pages (lazy-loaded in App.tsx)
│   ├── hooks/                # Reusable hooks (auth, notifications, etc.)
│   ├── integrations/         # Supabase client + generated types
│   ├── config/               # Navigation, feature flags, constants
│   ├── lib/ utils/           # Helpers
│   └── test/                 # Test setup & fixtures
├── db/                       # Shared TS schema types (aliased as @db)
├── supabase/
│   ├── migrations/           # SQL migrations
│   ├── functions/            # Deno edge functions
│   └── config.toml           # Supabase project + function config
├── packages/memory-client/   # Standalone TS client for the memory API
├── docs/                     # Product & feature docs
├── public/                   # Static assets (favicon, logo, robots.txt)
├── index.html                # Vite entry
├── vite.config.ts            # Vite config + manual chunking
├── tailwind.config.ts
├── eslint.config.js
└── package.json
```

Path aliases (see `vite.config.ts` / `tsconfig.json`):

- `@/*` → `src/*`
- `@db/*` → `db/*`

---

## Prerequisites

- **Node.js** 20+ (22 recommended; `@types/node` is pinned to 22)
- **npm** 10+ — or **Bun** 1.x (a `bun.lockb` is checked in)
- A **Supabase** project (free tier is enough to start)
- Optional, for full functionality:
  - Google Cloud project with YouTube Data API access
  - Microsoft 365 / Outlook app registration
  - Stripe account
  - Beehiiv account
  - Slack workspace + incoming webhook
  - An AI provider key (OpenAI/Anthropic) for the edge-function AI proxy

---

## Getting started

```sh
# 1. Clone
git clone <YOUR_GIT_URL>
cd mission-control-hub

# 2. Install dependencies (pick one)
npm install
# or
bun install

# 3. Configure environment
cp .env .env.local   # then edit .env.local with your own Supabase creds

# 4. Run the dev server (Vite, port 8080)
npm run dev
```

Then open http://localhost:8080. The app requires authentication; sign up via
the `/auth` page using your Supabase project's auth settings.

---

## Environment variables

The frontend reads a small set of `VITE_`-prefixed variables. Put them in a
local `.env` or `.env.local` file at the repo root:

```env
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

> The committed `.env` only contains the *anon/publishable* key, which is
> safe to ship to the browser. Never commit `service_role` keys or other
> server-side secrets.

Edge functions require additional secrets (AI providers, Outlook OAuth,
Stripe, YouTube, Beehiiv, Slack, etc.) set via `supabase secrets set` — see
each function's source for the exact names it reads from `Deno.env`.

---

## Available scripts

| Script                  | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Start Vite dev server on port 8080 with HMR          |
| `npm run build`         | Production build to `dist/`                          |
| `npm run build:dev`     | Build with `mode=development` (keeps dev-only code)  |
| `npm run build:analyze` | Build and emit `dist/stats.html` bundle visualiser   |
| `npm run preview`       | Preview the production build locally                 |
| `npm run lint`          | Run ESLint across the repo                           |
| `npm run test`          | Run the Vitest suite once                            |
| `npm run test:watch`    | Run Vitest in watch mode                             |

The production build applies aggressive manual chunking (see
`vite.config.ts`) to keep the initial bundle small — React/router, query,
Supabase, motion, markdown, PDF, flow-graph, Radix core vs. extras, forms,
and date utilities are all split into separate vendor chunks.

---

## Supabase (database & edge functions)

This repo is set up to work with the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
# Link the local repo to your Supabase project
supabase link --project-ref <your-project-ref>

# Apply all SQL migrations
supabase db push

# Serve edge functions locally
supabase functions serve

# Deploy a single edge function
supabase functions deploy <function-name>

# Deploy all edge functions
supabase functions deploy
```

Notable function categories (see `supabase/functions/`):

- **AI & agents** — `ai-proxy`, `assistant-chat`, `agent-orchestrator`,
  `agent-proactive-runner`, `strategist-daily-run`
- **Memory** — `memory-ingest`, `extract-memories`, `cluster-memories`,
  `merge-memories`, `memory-conflict-detector`, `memory-graph-query`,
  `semantic-cluster`, `mcp-memory-server`
- **YouTube** — analytics sync, comment/engagement scoring, competitor scan,
  viral playbook, push webhooks
- **Inbox / Outlook** — `outlook-sync`, `outlook-send`, `inbox-triage`,
  `classify-emails`, `auto-label-emails`, `inbox-automation`
- **Finance** — `stripe-sync`, `invoice-manager`, `tax-deductibility-review`
- **Subscribers / Beehiiv** — `beehiiv-sync`, `beehiiv-subscriber-sync`,
  `send-subscriber-sequence-email`, `detect-churn-risk`
- **Notifications** — `slack-notify`, `send-email`, `daily-briefing`

All edge functions declared in `supabase/config.toml` run with `verify_jwt =
false`; authentication is performed inside each function using the request's
Supabase session.

---

## Memory client package

`packages/memory-client` is a standalone TypeScript client
(`@mch/memory-client`) for talking to the Mission Control Hub memory API
from external LLMs or agents. Build it with:

```sh
cd packages/memory-client
npm install
npm run build
```

The compiled output lands in `packages/memory-client/dist/`.

---

## Testing & linting

- **Unit/component tests**: `npm run test` (Vitest + Testing Library, jsdom).
  Test setup lives in `src/test/`, and `vitest.config.ts` wires it up.
- **Linting**: `npm run lint` (ESLint 9 flat config, `eslint.config.js`).
  Includes `react-hooks` and `react-refresh` plugins.
- **Type-checking**: happens during `vite build`; run
  `npx tsc -p tsconfig.app.json --noEmit` to type-check without building.

---

## Deployment

Any static host that can serve a Vite build will work:

1. `npm run build`
2. Upload the contents of `dist/` (e.g. Vercel, Netlify, Cloudflare Pages,
   S3+CloudFront).
3. Configure SPA fallback so every route serves `index.html`.
4. Set the three `VITE_SUPABASE_*` env vars in your host.
5. Deploy Supabase migrations (`supabase db push`) and edge functions
   (`supabase functions deploy`) to the same Supabase project the frontend
   points at.

The project was originally bootstrapped in [Lovable](https://lovable.dev/) and
can still be edited there; changes pushed to the repo sync back automatically.

---

## Contributing

1. Create a feature branch off `main`.
2. Keep changes scoped — the codebase is already large, so prefer editing
   existing modules to introducing new ones.
3. Run `npm run lint` and `npm run test` before opening a PR.
4. For DB changes, add a new SQL file under `supabase/migrations/` with a
   timestamped name; never edit existing migrations.
5. For new edge functions, register them in `supabase/config.toml` if they
   should skip JWT verification.

---

## License

Proprietary — all rights reserved unless otherwise noted. The
`@mch/memory-client` package under `packages/memory-client` is released
under the MIT license (see its `package.json`).
