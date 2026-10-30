# DrainOps

DrainOps is a focused pre-storm maintenance simulator for a **Preston demonstration scenario**. It helps a dispatcher turn drainage reports into a feasible 90-minute work plan, animate crews through a 3D district, compare policies, and react when a parked vehicle blocks access.

It is a hackathon demonstration—not a council system, gully inventory, flood forecast, or engineering model.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Production verification is available with:

```bash
npm run lint
npm run build
```

## What works without any API key

- Interactive 3D control-room scene built from cached central-Preston OpenStreetMap road and building-footprint geometry, with 20 gully markers, rain, ponding and two animated cleaning vehicles.
- Report/evidence panel with duplicate reports and an explicitly uncertain possible-downstream issue.
- Three deterministic policies: nearest-first, fixed risk priority and a recorded evidence-led AI example.
- Feasibility-aware scheduling: two crews, travel/service time, 90-minute deadline, constraints and deferred work.
- Parked-vehicle event at G-05, followed by a visibly changed, feasible replan.
- Comparison metrics from the same illustrative scenario replay.

The `Generate AI plan` button calls a small server endpoint, but when live credentials are not configured it deliberately returns an **honestly labelled recorded example**. No client-side secret or paid API call is required for the core demo.

## 90-second judge flow

1. Start on the populated district. Point out the 90-minute rain clock, two crews and urgent red gully markers.
2. Select **G-01 Fishergate crossing**. Its report/photo evidence shows a visible leaf obstruction on an important bus route.
3. Click **Generate AI plan**. Explain that the recorded evidence-led recommendation is separately checked for crew travel, service duration and deadline.
4. Press play and follow the cyan/green vehicles; cleared markers turn green and their ponding shrinks.
5. Click **Introduce obstruction**. The parked van appears at G-05 and the evidence panel changes to access blocked.
6. Click **Replan from observation**. The inaccessible job is deferred and another feasible job enters the plan.
7. Open **Compare plans**. All three policies receive the same scenario; DrainOps reports the result instead of claiming the AI always wins.

## Configuration and credentials

Copy `.env.example` to `.env.local`; do not commit `.env.local`.

| Variable | Purpose |
| --- | --- |
| `XAI_API_KEY` | Server-only Grok runtime credential from [xAI Console](https://console.x.ai/). The current build does not make a live model call until a reviewed adapter is added. |
| `XAI_MODEL` | Server-only model configuration, defaulting to `grok-4.7`. Confirm account availability before enabling it. |
| `TAVILY_API_KEY` | Server-only Tavily credential from [Tavily](https://app.tavily.com/home). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Server-only Redis credentials from [Upstash](https://console.upstash.com/) for deployment-wide rate limits/call budgets when live integrations are enabled. |
| `RATE_LIMIT_SALT` | App secret for hashing rate-limit IDs. Generate at least 32 random bytes locally (for example Node `crypto.randomBytes`). |
| `APP_ORIGINS` | Exact permitted browser origins, including the deployed URL. |
| `LIVE_AI_ENABLED` | Safe default is `false`. |

No value uses a `NEXT_PUBLIC_` prefix. Cursor, Grok Bot and Vercel CLI credentials are development/deployment tools, not runtime app secrets. Do not add `GROKBOT_API_KEY`, `OPENAI_API_KEY`, a generic Prooflive key, or a Vercel token to the browser/application environment.

## Deploy to Vercel

The repository includes `vercel.json` with the Next.js framework, reproducible `npm ci` installation and `npm run build`. It deliberately does not override the output directory, routing, or add legacy `builds` rules—Vercel handles those for Next.js App Router projects.

1. Commit and push this directory to a new GitHub repository, including `package-lock.json`, `vercel.json` and `.nvmrc`.
2. In [Vercel](https://vercel.com/new), select **Import Git Repository**, choose that GitHub repository, and leave the root directory as `.`.
3. Vercel should show the **Next.js** framework preset. The deployment uses `npm ci` and `npm run build` from `vercel.json`; click **Deploy**.
4. The demonstration deploys with no environment variables because the simulator and recorded plan are bundled. For live services, add only the required values in **Project → Settings → Environment Variables**, keep `LIVE_AI_ENABLED=false` until the live adapter/Redis guards are implemented, and redeploy.
5. Once deployed, set `APP_ORIGINS` to the exact `https://…vercel.app` URL before any live paid service is enabled.

Vercel currently supports the Node 22 runtime selected in `.nvmrc`; `package.json` permits supported Node 20–24 versions locally.

No deployment URL is included because no Vercel account/session was provided.

## Sources and assumptions

The Sources drawer links to Lancashire County Council public material, including the September 2026 maintenance transparency report (~294,000 gullies), October 2026 drainage update (74,153 gullies cleaned), and April 2026 scrutiny minutes (~1,430 drainage improvement schemes estimated at £7.15m). These public facts are kept separate from this simulation.

The map scene is built from a small cached OpenStreetMap API extract of central Preston roads and building footprints (with on-screen attribution; [ODbL](https://www.openstreetmap.org/copyright)). All named gullies, reports, conditions, crews, rainfall, travel speeds, capacities and comparison outcomes are **illustrative demonstration data**. The ponding metric is an internal scenario indicator, not an estimate of flood risk, properties protected, monetary savings, or council operational performance. It is not an authoritative gully inventory.

## Architecture and safety status

The browser owns visualisation, state, animation and deterministic scheduling. Server routes are reserved for configuration, health and an opt-in planning boundary. Basic response headers are set centrally, payload shape is validated for `/api/plan`, and no secret is imported by a client component.

This rapid demo intentionally ships with **live AI and Tavily disabled**. Before switching either on, implement and test the requested xAI/Tavily adapters, Upstash-backed shared rate limits and atomic daily call budgets, exact-origin checks, streamed body/image limits, timeouts and upstream-output validation. Until then, no paid upstream request is made and the safe recorded fallback remains the product behaviour.
