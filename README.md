# Nexora Flow

**AI Deal-flow Matchmaker** — connects startups with corporations, universities, research institutions, and investment funds.

- **Domain:** [nexora-flow.cloud](https://nexora-flow.cloud)
- **Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript
- **Brand palette:** Vietnam AI Innovation Challenge (`#0059EE`, `#00A1F4`, `#00FBFC`, `#FAC515`, `#4153E6`)

## Product (from brief)

Nexora Flow automates the path from pitch deck → ranked partners → intro email → meeting → deal tracking. Humans stay in control at every critical step.

## Local development

```bash
cd landing
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm start       # serve production
```

## Deploy to Vercel

1. Log in with the team account that owns the project:

```bash
vercel login
vercel whoami
```

2. From the project root:

```bash
vercel link --yes
vercel --prod
```

3. Optional custom domain:

```bash
vercel domains add nexora-flow.cloud
```

## Docs

- [Startup Portal](./STARTUP_PORTAL.md) — founder flow (profile → match → connect)

## Structure

```
src/
  app/           # App Router (layout, pages, API)
  components/    # Landing + dashboard shell
  deal-flow/     # Startup portal SPA + matching backend
public/          # Static assets
```
