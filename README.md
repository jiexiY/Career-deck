Career Deck is a Next.js/Vercel-ready research database and monitoring platform
for internships, co-ops, fellowships, student communities, part-time and
full-time roles, hackathons, conferences, and startup opportunities.

The platform is built around a database contract first. Scrapers are independent
source adapters, so blocked or incomplete sources are recorded as review work
instead of being guessed into real opportunity records.

## Architecture

- `src/lib/career-deck/database.schema.sql` defines the relational data model.
- `src/lib/career-deck/adapters.ts` defines the `fetch`, `parse`, `normalize`,
  `validate`, and `save` adapter interface.
- `src/lib/career-deck/monitoring.ts` runs adapters without coupling them to
  the dashboard.
- `src/lib/career-deck/reports.ts` generates daily changelogs only from
  repository data.
- `src/lib/career-deck/exports.ts` exports validated database records.
- `src/app/components/CareerDeckDashboard.tsx` is the operational dashboard and
  manual review surface.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Guardrails

- Blocked sources save attempted timestamps and failure reasons.
- Manual review items can be approved, rejected, merged, edited, and associated
  with screenshots or PDFs.
- Confidence scores are shown for source, extraction, freshness, and duplicate
  probability.
- Daily reports compare today's report with the previous dated report.
- Missing source data is never fabricated.

## API

- `POST /api/monitor/run` runs the adapter registry and returns safe attempts.
- `GET /api/exports/opportunities` downloads database opportunity records as CSV.

## Build

```bash
npm run build
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
